import DatabaseConnection from '../database/connection.js';
import NotificationService from './NotificationService.js';
import { Alert, CreateAlertRequest, UpdateAlertRequest, User, AnalyticsResponse, AlertSeverity } from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class AlertService {
  private db: DatabaseConnection;
  private notificationService: NotificationService;

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new alert
   */
  public async createAlert(request: CreateAlertRequest, createdBy: string): Promise<Alert> {
    try {
      const alertId = uuidv4();
      const now = new Date();

      const alert: Alert = {
        id: alertId,
        title: request.title,
        message: request.message,
        severity: request.severity,
        visibilityType: request.visibilityType,
        visibilityTarget: request.visibilityTarget,
        startTime: request.startTime,
        expiryTime: request.expiryTime,
        reminderEnabled: request.reminderEnabled ?? true,
        createdBy,
        createdAt: now,
        updatedAt: now
      };

      await this.db.run(`
        INSERT INTO alerts 
        (id, title, message, severity, visibility_type, visibility_target, 
         start_time, expiry_time, reminder_enabled, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        alert.id, alert.title, alert.message, alert.severity,
        alert.visibilityType, alert.visibilityTarget,
        alert.startTime?.toISOString(),
        alert.expiryTime?.toISOString(),
        alert.reminderEnabled ? 1 : 0,
        alert.createdBy,
        alert.createdAt.toISOString(),
        alert.updatedAt.toISOString()
      ]);

      console.log(`✅ Alert created: ${alert.title} (${alert.id})`);

      // Deliver alert immediately if it's active
      if (!alert.startTime || alert.startTime <= now) {
        await this.notificationService.deliverAlert(alert.id);
      }

      return alert;
    } catch (error) {
      console.error('Failed to create alert:', error);
      throw new Error('Failed to create alert');
    }
  }

  /**
   * Update an existing alert
   */
  public async updateAlert(request: UpdateAlertRequest, updatedBy: string): Promise<Alert | null> {
    try {
      // First, check if alert exists and user has permission
      const existingAlert = await this.getAlertById(request.id);
      if (!existingAlert) {
        throw new Error('Alert not found');
      }

      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (request.title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(request.title);
      }
      if (request.message !== undefined) {
        updateFields.push('message = ?');
        updateValues.push(request.message);
      }
      if (request.severity !== undefined) {
        updateFields.push('severity = ?');
        updateValues.push(request.severity);
      }
      if (request.visibilityType !== undefined) {
        updateFields.push('visibility_type = ?');
        updateValues.push(request.visibilityType);
      }
      if (request.visibilityTarget !== undefined) {
        updateFields.push('visibility_target = ?');
        updateValues.push(request.visibilityTarget);
      }
      if (request.startTime !== undefined) {
        updateFields.push('start_time = ?');
        updateValues.push(request.startTime?.toISOString());
      }
      if (request.expiryTime !== undefined) {
        updateFields.push('expiry_time = ?');
        updateValues.push(request.expiryTime?.toISOString());
      }
      if (request.reminderEnabled !== undefined) {
        updateFields.push('reminder_enabled = ?');
        updateValues.push(request.reminderEnabled ? 1 : 0);
      }

      if (updateFields.length === 0) {
        return existingAlert; // No changes requested
      }

      // Add updated_at to all updates
      updateFields.push('updated_at = ?');
      updateValues.push(new Date().toISOString());

      // Add alert ID for WHERE clause
      updateValues.push(request.id);

      await this.db.run(`
        UPDATE alerts SET ${updateFields.join(', ')} 
        WHERE id = ? AND archived_at IS NULL
      `, updateValues);

      console.log(`✅ Alert updated: ${request.id}`);

      // Return updated alert
      return await this.getAlertById(request.id);
    } catch (error) {
      console.error('Failed to update alert:', error);
      throw new Error('Failed to update alert');
    }
  }

  /**
   * Archive an alert (soft delete)
   */
  public async archiveAlert(alertId: string, archivedBy: string): Promise<boolean> {
    try {
      const result = await this.db.run(
        'UPDATE alerts SET archived_at = ? WHERE id = ? AND archived_at IS NULL',
        [new Date().toISOString(), alertId]
      );

      if (result.changes === 0) {
        return false; // Alert not found or already archived
      }

      console.log(`🗄️ Alert archived: ${alertId}`);
      return true;
    } catch (error) {
      console.error('Failed to archive alert:', error);
      throw new Error('Failed to archive alert');
    }
  }

  /**
   * Get alert by ID
   */
  public async getAlertById(alertId: string): Promise<Alert | null> {
    try {
      const result = await this.db.get<any>(
        'SELECT * FROM alerts WHERE id = ? AND archived_at IS NULL',
        [alertId]
      );

      if (!result) return null;

      return this.mapDatabaseRowToAlert(result);
    } catch (error) {
      console.error('Failed to get alert:', error);
      return null;
    }
  }

  /**
   * Get all alerts (admin view)
   */
  public async getAllAlerts(filters?: {
    severity?: AlertSeverity;
    status?: 'active' | 'expired';
    visibilityType?: string;
  }): Promise<Alert[]> {
    try {
      let sql = 'SELECT * FROM alerts WHERE archived_at IS NULL';
      const params: any[] = [];

      if (filters?.severity) {
        sql += ' AND severity = ?';
        params.push(filters.severity);
      }

      if (filters?.status) {
        const now = new Date().toISOString();
        if (filters.status === 'active') {
          sql += ' AND (expiry_time IS NULL OR expiry_time > ?)';
          params.push(now);
        } else if (filters.status === 'expired') {
          sql += ' AND expiry_time IS NOT NULL AND expiry_time <= ?';
          params.push(now);
        }
      }

      if (filters?.visibilityType) {
        sql += ' AND visibility_type = ?';
        params.push(filters.visibilityType);
      }

      sql += ' ORDER BY created_at DESC';

      const results = await this.db.query<any>(sql, params);
      return results.map(row => this.mapDatabaseRowToAlert(row));
    } catch (error) {
      console.error('Failed to get all alerts:', error);
      return [];
    }
  }

  /**
   * Get alerts for a specific user
   */
  public async getUserAlerts(userId: string): Promise<any[]> {
    try {
      // Complex query to get user's alerts with their preferences
      const results = await this.db.query<any>(`
        SELECT 
          a.*,
          COALESCE(p.is_read, 0) as is_read,
          p.snoozed_until,
          COUNT(nd.id) as delivery_count,
          MAX(nd.delivered_at) as last_delivered
        FROM alerts a
        LEFT JOIN user_alert_preferences p ON p.alert_id = a.id AND p.user_id = ?
        LEFT JOIN notification_deliveries nd ON nd.alert_id = a.id AND nd.user_id = ?
        LEFT JOIN users u ON u.id = ?
        WHERE a.archived_at IS NULL
          AND (a.start_time IS NULL OR a.start_time <= datetime('now'))
          AND (a.expiry_time IS NULL OR a.expiry_time > datetime('now'))
          AND (
            (a.visibility_type = 'organization') OR
            (a.visibility_type = 'team' AND u.team_id = a.visibility_target) OR
            (a.visibility_type = 'user' AND a.visibility_target = ?)
          )
        GROUP BY a.id, p.is_read, p.snoozed_until
        ORDER BY a.created_at DESC
      `, [userId, userId, userId, userId]);

      return results.map(row => ({
        ...this.mapDatabaseRowToAlert(row),
        isRead: Boolean(row.is_read),
        snoozedUntil: row.snoozed_until ? new Date(row.snoozed_until) : undefined,
        deliveryCount: row.delivery_count || 0,
        lastDelivered: row.last_delivered ? new Date(row.last_delivered) : undefined
      }));
    } catch (error) {
      console.error('Failed to get user alerts:', error);
      return [];
    }
  }

  /**
   * Get analytics data
   */
  public async getAnalytics(): Promise<AnalyticsResponse> {
    try {
      // Total alerts
      const totalAlertsResult = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM alerts WHERE archived_at IS NULL'
      );
      const totalAlerts = totalAlertsResult?.count || 0;

      // Total deliveries
      const totalDeliveriesResult = await this.db.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM notification_deliveries'
      );
      const totalDeliveries = totalDeliveriesResult?.count || 0;

      // Read rate (percentage of delivered notifications that were read)
      const readRateResult = await this.db.get<{ rate: number }>(`
        SELECT 
          CASE 
            WHEN COUNT(nd.id) = 0 THEN 0
            ELSE (COUNT(CASE WHEN p.is_read = 1 THEN 1 END) * 100.0 / COUNT(nd.id))
          END as rate
        FROM notification_deliveries nd
        LEFT JOIN user_alert_preferences p ON p.alert_id = nd.alert_id AND p.user_id = nd.user_id
      `);
      const readRate = Math.round(readRateResult?.rate || 0);

      // Snooze rate
      const snoozeRateResult = await this.db.get<{ rate: number }>(`
        SELECT 
          CASE 
            WHEN COUNT(p1.id) = 0 THEN 0
            ELSE (COUNT(CASE WHEN p1.snoozed_until > datetime('now') THEN 1 END) * 100.0 / COUNT(p1.id))
          END as rate
        FROM user_alert_preferences p1
      `);
      const snoozeRate = Math.round(snoozeRateResult?.rate || 0);

      // Severity breakdown
      const severityResults = await this.db.query<{ severity: AlertSeverity; count: number }>(`
        SELECT severity, COUNT(*) as count 
        FROM alerts 
        WHERE archived_at IS NULL 
        GROUP BY severity
      `);
      const severityBreakdown = severityResults.reduce((acc, row) => {
        acc[row.severity] = row.count;
        return acc;
      }, {} as Record<AlertSeverity, number>);

      // Delivery stats
      const deliveryStatsResults = await this.db.query<{ status: string; count: number }>(`
        SELECT status, COUNT(*) as count 
        FROM notification_deliveries 
        GROUP BY status
      `);
      const deliveryStats = deliveryStatsResults.reduce((acc, row) => {
        acc[row.status as keyof typeof acc] = row.count;
        return acc;
      }, { delivered: 0, failed: 0, pending: 0 });

      // Top alerts by delivery count
      const topAlertsResults = await this.db.query<any>(`
        SELECT 
          a.id as alert_id,
          a.title,
          COUNT(nd.id) as delivery_count,
          COUNT(CASE WHEN p.is_read = 1 THEN 1 END) as read_count
        FROM alerts a
        LEFT JOIN notification_deliveries nd ON nd.alert_id = a.id
        LEFT JOIN user_alert_preferences p ON p.alert_id = a.id
        WHERE a.archived_at IS NULL
        GROUP BY a.id, a.title
        HAVING COUNT(nd.id) > 0
        ORDER BY delivery_count DESC
        LIMIT 10
      `);

      const topAlerts = topAlertsResults.map(row => ({
        alertId: row.alert_id,
        title: row.title,
        deliveryCount: row.delivery_count || 0,
        readCount: row.read_count || 0
      }));

      return {
        totalAlerts,
        totalDeliveries,
        readRate,
        snoozeRate,
        severityBreakdown,
        deliveryStats,
        topAlerts
      };
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw new Error('Failed to get analytics');
    }
  }

  /**
   * Map database row to Alert object
   */
  private mapDatabaseRowToAlert(row: any): Alert {
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      severity: row.severity as AlertSeverity,
      visibilityType: row.visibility_type,
      visibilityTarget: row.visibility_target,
      startTime: row.start_time ? new Date(row.start_time) : undefined,
      expiryTime: row.expiry_time ? new Date(row.expiry_time) : undefined,
      reminderEnabled: Boolean(row.reminder_enabled),
      createdBy: row.created_by,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }
}

export default AlertService;