import { Router } from 'express';
import AuthController from '../controllers/AuthController.js';
import AuthMiddleware from '../middleware/auth.js';

const router = Router();
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

// Public routes
router.post('/login', authController.login);

// Protected routes
router.get('/profile', authMiddleware.authenticate, authController.getProfile);
router.post('/refresh', authMiddleware.authenticate, authController.refreshToken);

export default router;