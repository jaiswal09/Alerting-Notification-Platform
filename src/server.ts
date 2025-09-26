import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import apiRoutes from './routes/index.js';
import ReminderScheduler from './scheduler/ReminderScheduler.js';
import DatabaseConnection from './database/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class Server {
  private app: express.Application;
  private reminderScheduler: ReminderScheduler;
  private db: DatabaseConnection;

  constructor() {
    this.app = express();
    this.reminderScheduler = new ReminderScheduler();
    this.db = DatabaseConnection.getInstance();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS middleware
    this.app.use(cors({
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
      message: { error: 'Too many requests, please try again later' },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api', limiter);

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // API routes
    this.app.use('/api', apiRoutes);

    // Health check for backend
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'Backend is running',
        timestamp: new Date().toISOString(),
        port: process.env.PORT || 3001
      });
    });
  }

  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', error);
      
      if (res.headersSent) {
        return next(error);
      }

      res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
      });
    });

    // 404 handler for API routes
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
  }

  public start(): void {
    const port = parseInt(process.env.PORT || '3001');

    this.app.listen(port, () => {
      console.log('🚀 Alerting & Notification Platform Started');
      console.log('=========================================');
      console.log(`🌐 Server: http://localhost:${port}`);
      console.log(`📊 Frontend: http://localhost:5173`);
      console.log(`📚 API Docs: http://localhost:${port}/api/docs`);
      console.log(`💚 Health Check: http://localhost:${port}/api/health`);
      console.log('');
      console.log('🔑 Default Login Credentials:');
      console.log('   Admin: admin@company.com / admin123');
      console.log('   User: john@company.com / user123');
      console.log('=========================================');

      // Start the reminder scheduler
      this.reminderScheduler.start();
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down gracefully...');
      this.reminderScheduler.stop();
      this.db.close();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      this.reminderScheduler.stop();
      this.db.close();
      process.exit(0);
    });
  }
}

// Start the server
const server = new Server();
server.start();