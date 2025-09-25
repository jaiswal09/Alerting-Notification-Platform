import { Response } from 'express';
import AlertService from '../services/AlertService.js';
import NotificationService from '../services/NotificationService.js';
import { AuthRequest } from '../middleware/auth.js';

export class UserController {
  private alertService: AlertService;
  private notificationService: NotificationService;

  constructor() {
    this.alertService = new AlertService();
    this.notificationService = new NotificationService();
  }

  /**
   * Get alerts for the current user
   */
  public getUserAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const alerts = await this.alertService.getUserAlerts(req.user.id);

      res.json({
        alerts,
        total: alerts.length,
        userId: req.user.id
      });
    } catch (error) {
      console.error('Get user alerts error:', error);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  };

  /**
   * Mark an alert as read
   */
  public markAlertAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const alertId = req.params.id;

      // Verify alert exists and user has access to it
      const alert = await this.alertService.getAlertById(alertId);
      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      await this.notificationService.markAlertAsRead(req.user.id, alertId);

      res.json({ 
        message: 'Alert marked as read',
        alertId,
        userId: req.user.id
      });
    } catch (error) {
      console.error('Mark alert as read error:', error);
      res.status(500).json({ error: 'Failed to mark alert as read' });
    }
  };

  /**
   * Snooze an alert
   */
  public snoozeAlert = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const alertId = req.params.id;
      const { hours = 24 } = req.body; // Default to 24 hours if not specified

      // Verify alert exists and user has access to it
      const alert = await this.alertService.getAlertById(alertId);
      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      // Validate hours parameter
      if (typeof hours !== 'number' || hours < 1 || hours > 168) { // Max 1 week
        res.status(400).json({ error: 'Hours must be a number between 1 and 168' });
        return;
      }

      await this.notificationService.snoozeAlert(req.user.id, alertId, hours);

      const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

      res.json({ 
        message: 'Alert snoozed',
        alertId,
        userId: req.user.id,
        snoozedUntil,
        hours
      });
    } catch (error) {
      console.error('Snooze alert error:', error);
      res.status(500).json({ error: 'Failed to snooze alert' });
    }
  };

  /**
   * Get user's alert preferences/history
   */
  public getAlertPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // This would get the user's notification preferences
      // For now, returning basic user alert statistics
      const alerts = await this.alertService.getUserAlerts(req.user.id);
      
      const totalAlerts = alerts.length;
      const readAlerts = alerts.filter(alert => alert.isRead).length;
      const snoozedAlerts = alerts.filter(alert => 
        alert.snoozedUntil && alert.snoozedUntil > new Date()
      ).length;
      const unreadAlerts = totalAlerts - readAlerts;

      res.json({
        userId: req.user.id,
        statistics: {
          totalAlerts,
          readAlerts,
          unreadAlerts,
          snoozedAlerts,
          readRate: totalAlerts > 0 ? Math.round((readAlerts / totalAlerts) * 100) : 0
        },
        preferences: {
          // Future: notification channel preferences, frequency settings, etc.
          reminderEnabled: true,
          preferredChannels: ['in_app']
        }
      });
    } catch (error) {
      console.error('Get alert preferences error:', error);
      res.status(500).json({ error: 'Failed to get alert preferences' });
    }
  };
}

export default UserController;