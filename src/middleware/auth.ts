import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import DatabaseConnection from '../database/connection.js';
import { User, AuthenticatedRequest } from '../types/index.js';

export interface AuthRequest extends Request {
  user?: User;
}

export class AuthMiddleware {
  private db: DatabaseConnection;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  /**
   * Middleware to verify JWT token and add user to request
   */
  public authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Authorization token required' });
        return;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

      // Verify token
      const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };

      // Get user from database
      const user = await this.db.get<User>(
        'SELECT id, name, email, team_id as teamId, role, created_at as createdAt FROM users WHERE id = ?',
        [decoded.userId]
      );

      if (!user) {
        res.status(401).json({ error: 'Invalid token: user not found' });
        return;
      }

      // Add user to request
      req.user = user;
      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        res.status(401).json({ error: 'Invalid token' });
      } else {
        console.error('Authentication error:', error);
        res.status(500).json({ error: 'Authentication failed' });
      }
    }
  };

  /**
   * Middleware to check if user is admin
   */
  public requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    next();
  };

  /**
   * Generate JWT token for user
   */
  public generateToken(user: User): string {
    const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
    const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

    return jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn }
    );
  }
}

export default AuthMiddleware;