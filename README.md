# Alerting & Notification Platform

A professional, enterprise-grade alerting and notification system built with clean architecture principles, designed for scalability and extensibility.

## 🚀 Features

### Admin Capabilities
- **Alert Management**: Create, update, and archive alerts with configurable properties
- **Audience Targeting**: Organization-wide, team-specific, or individual user targeting
- **Severity Control**: Info, Warning, and Critical alert levels
- **Time Management**: Start/expiry times with automatic cleanup
- **Analytics Dashboard**: Comprehensive metrics and reporting

### User Experience
- **Smart Notifications**: Receive relevant alerts based on role and team
- **Snooze Functionality**: Snooze alerts for the day with automatic reset
- **Read/Unread Tracking**: Persistent state management
- **Recurring Reminders**: Automatic 2-hour intervals until acknowledged

### Technical Excellence
- **Design Patterns**: Strategy, Observer, and State patterns implementation
- **Clean Architecture**: Separation of concerns with modular design
- **Type Safety**: Full TypeScript implementation
- **Extensible**: Easy addition of new channels and features
- **Professional UI**: Modern, responsive interface

## 🏗️ Architecture

### Design Patterns Used

**Strategy Pattern**: Notification delivery channels
```typescript
interface NotificationChannel {
  deliver(notification: Notification, user: User): Promise<DeliveryResult>;
}
```

**Observer Pattern**: User subscriptions to alerts
```typescript
interface AlertObserver {
  notify(alert: Alert): void;
}
```

**State Pattern**: Alert state management (active, snoozed, expired)
```typescript
interface AlertState {
  handle(context: AlertContext): void;
}
```

### Core Components

- **Alert Management**: CRUD operations with business logic
- **Notification Engine**: Delivery and scheduling system
- **User Preference Manager**: Snooze and read state handling
- **Analytics Service**: Metrics aggregation and reporting
- **Scheduler**: Recurring reminder management

## 🛠️ Technology Stack

- **Backend**: Node.js with Express and TypeScript
- **Database**: SQLite with migrations (easily switchable to PostgreSQL/MySQL)
- **Frontend**: Modern HTML5, CSS3, and TypeScript
- **Architecture**: Clean Architecture with SOLID principles
- **Patterns**: Strategy, Observer, State, Repository patterns

## 📊 Database Schema

```sql
-- Core entities
Users (id, name, email, team_id, role, created_at)
Teams (id, name, description, created_at)
Alerts (id, title, message, severity, visibility_type, visibility_target, 
        start_time, expiry_time, reminder_enabled, created_by, created_at)

-- Tracking and preferences
NotificationDelivery (id, alert_id, user_id, channel, delivered_at, status)
UserAlertPreference (id, user_id, alert_id, is_read, snoozed_until, updated_at)
```

## 🔧 API Endpoints

### Admin Endpoints
```
POST   /api/admin/alerts          # Create alert
PUT    /api/admin/alerts/:id      # Update alert
GET    /api/admin/alerts          # List all alerts
DELETE /api/admin/alerts/:id      # Archive alert
GET    /api/admin/analytics       # System analytics
```

### User Endpoints
```
GET    /api/user/alerts           # Get user alerts
POST   /api/user/alerts/:id/read  # Mark as read
POST   /api/user/alerts/:id/snooze # Snooze alert
GET    /api/user/preferences      # Get preferences
```

### System Endpoints
```
GET    /api/health                # Health check
GET    /api/docs                  # API documentation
POST   /api/scheduler/trigger     # Manual reminder trigger
```

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Basic understanding of REST APIs

### Quick Start
1. Follow the detailed instructions in `setup.txt`
2. Run `npm install` to install dependencies
3. Run `npm run setup:db` to initialize the database
4. Run `npm run dev` to start the development server
5. Visit `http://localhost:3001` to access the platform

### Test Accounts
- **Admin**: admin@company.com / admin123
- **User**: john@company.com / user123
- **User**: jane@company.com / user123

## 🧪 Testing

```bash
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests only
npm run test:coverage  # Coverage report
```

## 📈 Performance Features

- **Efficient Querying**: Indexed database queries for fast lookups
- **Batch Processing**: Bulk notification delivery
- **Caching Layer**: In-memory caching for frequently accessed data
- **Connection Pooling**: Optimized database connections
- **Graceful Degradation**: Fallback mechanisms for reliability

## 🔮 Future Enhancements

The codebase is designed for easy extension:

### Planned Features
- **Email/SMS Channels**: Extensible notification system
- **Custom Frequencies**: Configurable reminder intervals
- **Escalation Rules**: Automatic severity upgrades
- **Role-Based Access**: Granular permission system
- **Push Notifications**: Mobile app integration
- **Scheduled Alerts**: Cron-based scheduling

### Adding New Features
The modular architecture makes adding features straightforward:

```typescript
// Add new notification channel
class EmailNotificationChannel implements NotificationChannel {
  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    // Implementation
  }
}

// Register with factory
NotificationChannelFactory.register('email', EmailNotificationChannel);
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Follow the established patterns and coding standards
4. Add tests for new functionality
5. Submit a pull request

## 📝 Code Standards

- **TypeScript**: Strict mode enabled with comprehensive typing
- **ESLint**: Enforced code quality and consistency
- **Prettier**: Automated code formatting
- **SOLID Principles**: Single Responsibility, Open/Closed, etc.
- **Clean Code**: Meaningful names, small functions, clear structure

## 🐛 Troubleshooting

### Common Issues
- **Database Connection**: Ensure SQLite file permissions are correct
- **Port Conflicts**: Change PORT in .env if 3001 is occupied
- **Dependencies**: Run `npm ci` for clean dependency installation

### Development Tips
- Use `npm run dev` for hot reloading during development
- Check `logs/` directory for application logs
- Use the `/api/health` endpoint to verify system status

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏆 Architecture Highlights

This project demonstrates:
- **Clean Architecture**: Business logic separated from infrastructure
- **SOLID Principles**: Each class has a single, well-defined responsibility
- **Design Patterns**: Proper implementation of Gang of Four patterns
- **Type Safety**: Comprehensive TypeScript usage
- **Testing**: Unit and integration test coverage
- **Documentation**: Clear, comprehensive documentation

Built with enterprise-grade practices and production-ready code quality.