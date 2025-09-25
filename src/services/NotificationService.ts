import DatabaseConnection from '../database/connection.js';
import { default as NotificationChannelFactory, NotificationChannelStrategy } from './NotificationChannelFactory.ts';
import AlertStateManager from './AlertStateManager.ts';
import { 
  Alert, 
  User, 
  Notification, 
  NotificationDelivery, 
  UserAlertPreference, 
  DeliveryStatus,
  NotificationChannel 
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class NotificationService {
  private db: DatabaseConnection;
  private enabledChannels: NotificationChannelStrategy[];

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.enabledChannels = NotificationChannelFactory.getEnabledChannels();
  }

  /**
   * Deliver an alert to all eligible users
   */
  public async deliverAlert(alertId: string): Promise<void> {
    try {
      // Get alert details
      const alert = await this.getAlert(alertId);
      if (!alert) {
        throw new Error(`Alert ${alertId} not found`);
      }

      // Get eligible users based on visibility settings
      const eligibleUsers = await this.getEligibleUsers(alert);

      // Deliver to each eligible user
      for (const user of eligibleUsers) {
        await this.deliverToUser(alert, user);
      }

      console.log(`✅ Alert ${alertId} delivered to ${eligibleUsers.length} users`);
    } catch (error) {
      console.error(`❌ Failed to deliver alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Process reminder notifications (called by scheduler)
   */
  public async processReminders(): Promise<void> {
    try {
      // Get all active alerts that have reminders enabled
      const activeAlerts = await this.getActiveAlertsWithReminders();

      for (const alert of activeAlerts) {
        await this.processAlertReminders(alert);
      }

      console.log(`🔔 Processed reminders for ${activeAlerts.length} alerts`);
    } catch (error) {
      console.error('❌ Failed to process reminders:', error);
    }
  }

  /**
   * Deliver an alert to a specific user
   */
  private async deliverToUser(alert: Alert, user: User): Promise<void> {
    try {
      // Get user's alert preference
      const preference = await this.getUserAlertPreference(user.id, alert.id);

      // Check if alert can be delivered based on state
      if (!AlertStateManager.canDeliver(alert, user, preference)) {
        return;
      }

      // Create notification object
      const notification: Notification = {
        id: uuidv4(),
        alertId: alert.id,
        title: alert.title,
        message: alert.message,
        severity: alert.severity,
        createdAt: new Date()
      };

      // Deliver through each enabled channel
      for (const channel of this.enabledChannels) {
        const result = await channel.deliver(notification, user);
        
        // Record delivery attempt
        await this.recordDelivery({
          id: uuidv4(),
          alertId: alert.id,
          userId: user.id,
          channel: channel.getName() as NotificationChannel,
          deliveredAt: new Date(),
          status: result.success ? DeliveryStatus.DELIVERED : DeliveryStatus.FAILED,
          metadata: result.metadata
        });

        if (!result.success) {
          console.error(`Failed to deliver via ${channel.getName()}:`, result.error);
        }
      }

      // Create or update user preference record
      await this.ensureUserAlertPreference(user.id, alert.id);

    } catch (error) {
      console.error(`Failed to deliver alert ${alert.id} to user ${user.id}:`, error);
    }
  }

  /**
   * Process reminders for a specific alert
   */
  private async processAlertReminders(alert: Alert): Promise<void> {
    try {
      // Get users who should receive reminders for this alert
      const usersNeedingReminders = await this.getUsersNeedingReminders(alert.id);

      for (const user of usersNeedingReminders) {
        const preference = await this.getUserAlertPreference(user.id, alert.id);
        
        if (preference && AlertStateManager.shouldCreateReminder(alert, preference)) {
          // Get last delivery time
          const lastDelivery = await this.getLastDeliveryTime(alert.id, user.id);
          
          // Check if enough time has passed for next reminder
          const nextReminderTime = AlertStateManager.getNextReminderTime(alert, preference, lastDelivery);
          
          if (nextReminderTime && nextReminderTime <= new Date()) {
            await this.deliverToUser(alert, user);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to process reminders for alert ${alert.id}:`, error);
    }
  }

  /**
   * Get alert by ID
   */
  private async getAlert(alertId: string): Promise<Alert | null> {
    const result = await this.db.get<Alert>(
      'SELECT * FROM alerts WHERE id = ? AND archived_at IS NULL',
      [alertId]
    );
    return result;
  }

  /**
   * Get eligible users based on alert visibility settings
   */
  private async getEligibleUsers(alert: Alert): Promise<User[]> {
    let sql = '';
    let params: any[] = [];

    switch (alert.visibilityType) {
      case 'organization':
        sql = 'SELECT * FROM users WHERE role IN (?, ?)';
        params = ['admin', 'user'];
        break;
      case 'team':
        sql = 'SELECT * FROM users WHERE team_id = ?';
        params = [alert.visibilityTarget];
        break;
      case 'user':
        sql = 'SELECT * FROM users WHERE id = ?';
        params = [alert.visibilityTarget];
        break;
      default:
        return [];
    }

    return await this.db.query<User>(sql, params);
  }

  /**
   * Get active alerts with reminders enabled
   */
  private async getActiveAlertsWithReminders(): Promise<Alert[]> {
    const now = new Date().toISOString();
    return await this.db.query<Alert>(`
      SELECT * FROM alerts 
      WHERE reminder_enabled = 1 
        AND archived_at IS NULL
        AND (start_time IS NULL OR start_time <= ?)
        AND (expiry_time IS NULL OR expiry_time > ?)
    `, [now, now]);
  }

  /**
   * Get users who need reminders for a specific alert
   */
  private async getUsersNeedingReminders(alertId: string): Promise<User[]> {
    // This is a complex query that finds users who:
    // 1. Are eligible to receive the alert
    // 2. Haven't read it yet
    // 3. Are not currently snoozed
    return await this.db.query<User>(`
      SELECT DISTINCT u.* FROM users u
      JOIN alerts a ON 1=1
      LEFT JOIN user_alert_preferences p ON p.user_id = u.id AND p.alert_id = a.id
      WHERE a.id = ?
        AND (
          (a.visibility_type = 'organization') OR
          (a.visibility_type = 'team' AND u.team_id = a.visibility_target) OR
          (a.visibility_type = 'user' AND u.id = a.visibility_target)
        )
        AND (p.is_read IS NULL OR p.is_read = 0)
        AND (p.snoozed_until IS NULL OR p.snoozed_until < datetime('now'))
    `, [alertId]);
  }

  /**
   * Get user's alert preference
   */
  private async getUserAlertPreference(userId: string, alertId: string): Promise<UserAlertPreference | null> {
    return await this.db.get<UserAlertPreference>(
      'SELECT * FROM user_alert_preferences WHERE user_id = ? AND alert_id = ?',
      [userId, alertId]
    );
  }

  /**
   * Ensure user alert preference record exists
   */
  private async ensureUserAlertPreference(userId: string, alertId: string): Promise<void> {
    await this.db.run(`
      INSERT OR IGNORE INTO user_alert_preferences (id, user_id, alert_id, is_read)
      VALUES (?, ?, ?, 0)
    `, [uuidv4(), userId, alertId]);
  }

  /**
   * Record notification delivery
   */
  private async recordDelivery(delivery: NotificationDelivery): Promise<void> {
    await this.db.run(`
      INSERT INTO notification_deliveries 
      (id, alert_id, user_id, channel, delivered_at, status, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      delivery.id,
      delivery.alertId,
      delivery.userId,
      delivery.channel,
      delivery.deliveredAt.toISOString(),
      delivery.status,
      delivery.metadata ? JSON.stringify(delivery.metadata) : null
    ]);
  }

  /**
   * Get last delivery time for user and alert
   */
  private async getLastDeliveryTime(alertId: string, userId: string): Promise<Date | null> {
    const result = await this.db.get<{ delivered_at: string }>(
      'SELECT delivered_at FROM notification_deliveries WHERE alert_id = ? AND user_id = ? ORDER BY delivered_at DESC LIMIT 1',
      [alertId, userId]
    );
    
    return result ? new Date(result.delivered_at) : null;
  }

  /**
   * Mark alert as read for user
   */
  public async markAlertAsRead(userId: string, alertId: string): Promise<void> {
    await this.db.run(`
      INSERT OR REPLACE INTO user_alert_preferences (id, user_id, alert_id, is_read, updated_at)
      VALUES (
        COALESCE((SELECT id FROM user_alert_preferences WHERE user_id = ? AND alert_id = ?), ?),
        ?, ?, 1, datetime('now')
      )
    `, [userId, alertId, uuidv4(), userId, alertId]);

    console.log(`✅ Alert ${alertId} marked as read for user ${userId}`);
  }

  /**
   * Snooze alert for user
   */
  public async snoozeAlert(userId: string, alertId: string, hoursToSnooze: number = 24): Promise<void> {
    const snoozedUntil = new Date(Date.now() + hoursToSnooze * 60 * 60 * 1000);
    
    await this.db.run(`
      INSERT OR REPLACE INTO user_alert_preferences (id, user_id, alert_id, is_read, snoozed_until, updated_at)
      VALUES (
        COALESCE((SELECT id FROM user_alert_preferences WHERE user_id = ? AND alert_id = ?), ?),
        ?, ?, 
        COALESCE((SELECT is_read FROM user_alert_preferences WHERE user_id = ? AND alert_id = ?), 0),
        ?, datetime('now')
      )
    `, [userId, alertId, uuidv4(), userId, alertId, userId, alertId, snoozedUntil.toISOString()]);

    console.log(`😴 Alert ${alertId} snoozed for user ${userId} until ${snoozedUntil}`);
  }
}

export default NotificationService;