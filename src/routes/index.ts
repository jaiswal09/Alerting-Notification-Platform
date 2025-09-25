import { Router } from 'express';
import authRoutes from './auth.js';
import adminRoutes from './admin.js';
import userRoutes from './user.js';

const router = Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Documentation
router.get('/docs', (req, res) => {
  res.json({
    title: 'Alerting & Notification Platform API',
    version: '1.0.0',
    description: 'Professional alerting system with clean architecture',
    endpoints: {
      auth: {
        'POST /api/auth/login': 'User authentication',
        'GET /api/auth/profile': 'Get current user profile',
        'POST /api/auth/refresh': 'Refresh authentication token'
      },
      admin: {
        'POST /api/admin/alerts': 'Create new alert',
        'GET /api/admin/alerts': 'List all alerts with filters',
        'GET /api/admin/alerts/:id': 'Get specific alert',
        'PUT /api/admin/alerts/:id': 'Update alert',
        'DELETE /api/admin/alerts/:id': 'Archive alert',
        'GET /api/admin/analytics': 'System analytics',
        'POST /api/admin/alerts/:id/deliver': 'Manual alert delivery',
        'POST /api/admin/process-reminders': 'Process all reminders'
      },
      user: {
        'GET /api/user/alerts': 'Get user alerts',
        'POST /api/user/alerts/:id/read': 'Mark alert as read',
        'POST /api/user/alerts/:id/snooze': 'Snooze alert',
        'GET /api/user/preferences': 'Get user preferences'
      }
    },
    authentication: {
      type: 'Bearer Token',
      header: 'Authorization: Bearer <token>',
      note: 'Use /api/auth/login to get a token'
    }
  });
});

// Mount route modules
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);

export default router;