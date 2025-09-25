import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import DatabaseConnection from '../database/connection.js';
import AuthMiddleware from '../middleware/auth.js';
import { User } from '../types/index.js';

export class AuthController {
  private db: DatabaseConnection;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.db = DatabaseConnection.getInstance();
    this.authMiddleware = new AuthMiddleware();
  }

  /**
   * User login
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      // Get user by email
      const user = await this.db.get<any>(
        'SELECT id, name, email, password_hash, team_id as teamId, role, created_at as createdAt FROM users WHERE email = ?',
        [email.toLowerCase()]
      );

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      // Generate token
      const userObj: User = {
        id: user.id,
        name: user.name,
        email: user.email,
        teamId: user.teamId,
        role: user.role,
        createdAt: new Date(user.createdAt)
      };

      const token = this.authMiddleware.generateToken(userObj);

      res.json({
        token,
        user: {
          id: userObj.id,
          name: userObj.name,
          email: userObj.email,
          role: userObj.role,
          teamId: userObj.teamId
        }
      });

      console.log(`✅ User logged in: ${user.email}`);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  };

  /**
   * Get current user profile
   */
  public getProfile = async (req: any, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      // Get additional user details including team name
      const userDetails = await this.db.get<any>(`
        SELECT 
          u.id, u.name, u.email, u.role, u.created_at,
          t.name as team_name, t.id as team_id
        FROM users u
        LEFT JOIN teams t ON t.id = u.team_id
        WHERE u.id = ?
      `, [user.id]);

      if (!userDetails) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({
        id: userDetails.id,
        name: userDetails.name,
        email: userDetails.email,
        role: userDetails.role,
        teamId: userDetails.team_id,
        teamName: userDetails.team_name,
        createdAt: userDetails.created_at
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  };

  /**
   * Refresh token
   */
  public refreshToken = async (req: any, res: Response): Promise<void> => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const newToken = this.authMiddleware.generateToken(user);

      res.json({ token: newToken });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Failed to refresh token' });
    }
  };
}

export default AuthController;