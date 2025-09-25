import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseSetup {
  private db: sqlite3.Database;
  private schemaPath: string;

  constructor() {
    // Ensure database directory exists
    const dbDir = join(__dirname, '../../database');
    
    // Check for directory existence using the correct import
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    this.db = new sqlite3.Database(join(dbDir, 'notifications.db'));
    this.schemaPath = join(__dirname, '../../supabase/migrations/20250924111150_mellow_thunder.sql');
  }

  async setup(): Promise<void> {
    try {
      console.log('🗄️  Setting up database...');
      
      // Create schema
      await this.createSchema();
      
      // Insert seed data
      await this.insertSeedData();
      
      console.log('✅ Database setup completed successfully!');
      console.log('\n📊 Sample data created:');
      console.log('   - Admin user: admin@company.com (password: admin123)');
      console.log('   - Regular users: john@company.com, jane@company.com (password: user123)');
      console.log('   - Teams: Engineering, Marketing, Sales');
      console.log('   - Sample alerts with different severities and visibility');
      
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    } finally {
      this.db.close();
    }
  }

  private async createSchema(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
        const schema = await fs.readFile(this.schemaPath, 'utf-8');
        this.db.exec(schema, (error) => {
          if (error) {
            reject(error);
          } else {
            console.log('📋 Database schema created');
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async insertSeedData(): Promise<void> {
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
    const userPasswordHash = await bcrypt.hash('user123', saltRounds);

    // Teams data
    const teams = [
      { id: 'team-eng-001', name: 'Engineering', description: 'Software development and infrastructure team' },
      { id: 'team-mkt-001', name: 'Marketing', description: 'Marketing and communications team' },
      { id: 'team-sal-001', name: 'Sales', description: 'Sales and business development team' }
    ];

    // Users data
    const users = [
      {
        id: 'user-admin-001',
        name: 'System Administrator',
        email: 'admin@company.com',
        password_hash: adminPasswordHash,
        team_id: 'team-eng-001',
        role: 'admin'
      },
      {
        id: 'user-john-001',
        name: 'John Smith',
        email: 'john@company.com',
        password_hash: userPasswordHash,
        team_id: 'team-eng-001',
        role: 'user'
      },
      {
        id: 'user-jane-001',
        name: 'Jane Doe',
        email: 'jane@company.com',
        password_hash: userPasswordHash,
        team_id: 'team-mkt-001',
        role: 'user'
      },
      {
        id: 'user-bob-001',
        name: 'Bob Wilson',
        email: 'bob@company.com',
        password_hash: userPasswordHash,
        team_id: 'team-sal-001',
        role: 'user'
      }
    ];

    // Alerts data
    const alerts = [
      {
        id: 'alert-001',
        title: 'System Maintenance Scheduled',
        message: 'Scheduled maintenance will occur this weekend from 2 AM to 6 AM EST. All services will be temporarily unavailable.',
        severity: 'warning',
        visibility_type: 'organization',
        visibility_target: null,
        start_time: new Date().toISOString(),
        expiry_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        reminder_enabled: 1,
        created_by: 'user-admin-001'
      },
      {
        id: 'alert-002',
        title: 'Security Policy Update',
        message: 'New security policies are now in effect. Please review the updated guidelines in the employee handbook.',
        severity: 'info',
        visibility_type: 'team',
        visibility_target: 'team-eng-001',
        start_time: new Date().toISOString(),
        expiry_time: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
        reminder_enabled: 1,
        created_by: 'user-admin-001'
      },
      {
        id: 'alert-003',
        title: 'Critical: Server Outage',
        message: 'Production server is experiencing issues. Technical team is investigating. Updates will be provided every 30 minutes.',
        severity: 'critical',
        visibility_type: 'team',
        visibility_target: 'team-eng-001',
        start_time: new Date().toISOString(),
        expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        reminder_enabled: 1,
        created_by: 'user-admin-001'
      },
      {
        id: 'alert-004',
        title: 'Welcome to the Platform!',
        message: 'Welcome to our new alerting system! You can manage your notification preferences in your profile.',
        severity: 'info',
        visibility_type: 'user',
        visibility_target: 'user-john-001',
        start_time: new Date().toISOString(),
        expiry_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        reminder_enabled: 1,
        created_by: 'user-admin-001'
      }
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Insert teams
        const teamStmt = this.db.prepare(
          'INSERT OR IGNORE INTO teams (id, name, description) VALUES (?, ?, ?)'
        );
        
        teams.forEach(team => {
          teamStmt.run(team.id, team.name, team.description);
        });
        teamStmt.finalize();

        // Insert users
        const userStmt = this.db.prepare(
          'INSERT OR IGNORE INTO users (id, name, email, password_hash, team_id, role) VALUES (?, ?, ?, ?, ?, ?)'
        );
        
        users.forEach(user => {
          userStmt.run(user.id, user.name, user.email, user.password_hash, user.team_id, user.role);
        });
        userStmt.finalize();

        // Insert alerts
        const alertStmt = this.db.prepare(`
          INSERT OR IGNORE INTO alerts 
          (id, title, message, severity, visibility_type, visibility_target, start_time, expiry_time, reminder_enabled, created_by) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        alerts.forEach(alert => {
          alertStmt.run(
            alert.id, alert.title, alert.message, alert.severity,
            alert.visibility_type, alert.visibility_target,
            alert.start_time, alert.expiry_time, alert.reminder_enabled,
            alert.created_by
          );
        });
        alertStmt.finalize();

        // Create initial notification deliveries and preferences
        const deliveryStmt = this.db.prepare(
          'INSERT OR IGNORE INTO notification_deliveries (alert_id, user_id, channel, status) VALUES (?, ?, ?, ?)'
        );
        
        const prefStmt = this.db.prepare(
          'INSERT OR IGNORE INTO user_alert_preferences (user_id, alert_id, is_read) VALUES (?, ?, ?)'
        );

        // Simulate some deliveries and preferences
        users.forEach(user => {
          alerts.forEach(alert => {
            // Check if user should receive this alert based on visibility
            const shouldReceive = this.shouldUserReceiveAlert(user, alert);
            
            if (shouldReceive) {
              deliveryStmt.run(alert.id, user.id, 'in_app', 'delivered');
              prefStmt.run(user.id, alert.id, Math.random() > 0.5 ? 1 : 0); // Random read status
            }
          });
        });

        deliveryStmt.finalize();
        prefStmt.finalize();

        console.log('📊 Seed data inserted');
        resolve();
      });

      this.db.on('error', reject);
    });
  }

  private shouldUserReceiveAlert(user: any, alert: any): boolean {
    if (alert.visibility_type === 'organization') return true;
    if (alert.visibility_type === 'team') return user.team_id === alert.visibility_target;
    if (alert.visibility_type === 'user') return user.id === alert.visibility_target;
    return false;
  }
}

// Run setup if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new DatabaseSetup();
  setup.setup().catch(console.error);
}

export default DatabaseSetup;