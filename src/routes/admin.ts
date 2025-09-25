import { Router } from 'express';
import AdminController from '../controllers/AdminController.js';
import AuthMiddleware from '../middleware/auth.js';

const router = Router();
const adminController = new AdminController();
const authMiddleware = new AuthMiddleware();

// All admin routes require authentication and admin role
router.use(authMiddleware.authenticate);
router.use(authMiddleware.requireAdmin);

// Alert management
router.post('/alerts', adminController.createAlert);
router.get('/alerts', adminController.getAllAlerts);
router.get('/alerts/:id', adminController.getAlert);
router.put('/alerts/:id', adminController.updateAlert);
router.delete('/alerts/:id', adminController.archiveAlert);

// Manual triggers (for testing/debugging)
router.post('/alerts/:id/deliver', adminController.triggerAlertDelivery);
router.post('/process-reminders', adminController.processReminders);

// Analytics
router.get('/analytics', adminController.getAnalytics);

export default router;