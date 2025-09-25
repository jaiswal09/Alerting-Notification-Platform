import { Router } from 'express';
import UserController from '../controllers/UserController.js';
import AuthMiddleware from '../middleware/auth.js';

const router = Router();
const userController = new UserController();
const authMiddleware = new AuthMiddleware();

// All user routes require authentication
router.use(authMiddleware.authenticate);

// Alert management
router.get('/alerts', userController.getUserAlerts);
router.post('/alerts/:id/read', userController.markAlertAsRead);
router.post('/alerts/:id/snooze', userController.snoozeAlert);

// User preferences
router.get('/preferences', userController.getAlertPreferences);

export default router;