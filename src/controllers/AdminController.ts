import { Response } from 'express';
import AlertService from '../services/AlertService.js';
import NotificationService from '../services/NotificationService.js';
import { CreateAlertRequest, UpdateAlertRequest } from '../types/index.js';
import { AuthRequest } from '../middleware/auth.js';

export class AdminController {
  private alertService: AlertService;
  private notificationService: NotificationService;

  constructor() {
    this.alertService = new AlertService();
    this.notificationService = new NotificationService();
  }

  /**
   * Create a new alert
   */
  public createAlert = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const alertData: CreateAlertRequest = req.body;

      // Validate required fields
      if (!alertData.title || !alertData.message || !alertData.severity || !alertData.visibilityType) {
        res.status(400).json({ error: 'Title, message, severity, and visibility type are required' });
        return;
      }

      // Validate visibility target if needed
      if ((alertData.visibilityType === 'team' || alertData.visibilityType === 'user') && !alertData.visibilityTarget) {
        res.status(400).json({ error: 'Visibility target is required for team and user visibility types' });
        return;
      }

      const alert = await this.alertService.createAlert(alertData, req.user.id);

      res.status(201).json({
        message: 'Alert created successfully',
        alert
      });
    } catch (error) {
      console.error('Create alert error:', error);
      res.status(500).json({ error: 'Failed to create alert' });
    }
  };

  /**
   * Update an existing alert
   */
  public updateAlert = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const alertId = req.params.id;
      const updates: Partial<CreateAlertRequest> = req.body;

      const updateRequest: UpdateAlertRequest = {
        id: alertId,
        ...updates
      };

      const updatedAlert = await this.alertService.updateAlert(updateRequest, req.user.id);

      if (!updatedAlert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json({
        message: 'Alert updated successfully',
        alert: updatedAlert
      });
    } catch (error) {
      console.error('Update alert error:', error);
      res.status(500).json({ error: 'Failed to update alert' });
    }
  };

  /**
   * Archive an alert
   */
  public archiveAlert = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const alertId = req.params.id;
      const success = await this.alertService.archiveAlert(alertId, req.user.id);

      if (!success) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json({ message: 'Alert archived successfully' });
    } catch (error) {
      console.error('Archive alert error:', error);
      res.status(500).json({ error: 'Failed to archive alert' });
    }
  };

  /**
   * Get all alerts (admin view)
   */
  public getAllAlerts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const filters = {
        severity: req.query.severity as any,
        status: req.query.status as 'active' | 'expired',
        visibilityType: req.query.visibilityType as string
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key as keyof typeof filters] === undefined) {
          delete filters[key as keyof typeof filters];
        }
      });

      const alerts = await this.alertService.getAllAlerts(filters);

      res.json({
        alerts,
        total: alerts.length,
        filters
      });
    } catch (error) {
      console.error('Get all alerts error:', error);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  };

  /**
   * Get a specific alert
   */
  public getAlert = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const alertId = req.params.id;
      const alert = await this.alertService.getAlertById(alertId);

      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      res.json({ alert });
    } catch (error) {
      console.error('Get alert error:', error);
      res.status(500).json({ error: 'Failed to get alert' });
    }
  };

  /**
   * Get system analytics
   */
  public getAnalytics = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const analytics = await this.alertService.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error('Get analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  };

  /**
   * Manually trigger alert delivery (for testing)
   */
  public triggerAlertDelivery = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const alertId = req.params.id;
      
      // Verify alert exists
      const alert = await this.alertService.getAlertById(alertId);
      if (!alert) {
        res.status(404).json({ error: 'Alert not found' });
        return;
      }

      await this.notificationService.deliverAlert(alertId);

      res.json({ 
        message: 'Alert delivery triggered successfully',
        alertId 
      });
    } catch (error) {
      console.error('Trigger alert delivery error:', error);
      res.status(500).json({ error: 'Failed to trigger alert delivery' });
    }
  };

  /**
   * Process all reminders manually (for testing)
   */
  public processReminders = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await this.notificationService.processReminders();

      res.json({ message: 'Reminders processed successfully' });
    } catch (error) {
      console.error('Process reminders error:', error);
      res.status(500).json({ error: 'Failed to process reminders' });
    }
  };
}

export default AdminController;