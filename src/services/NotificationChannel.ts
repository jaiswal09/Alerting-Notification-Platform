import { INotificationChannel, DeliveryResult, Notification, User } from '../types/index.js';

// Strategy Pattern: Notification Channel Interface
export interface NotificationChannelStrategy extends INotificationChannel {
  deliver(notification: Notification, user: User): Promise<DeliveryResult>;
  getName(): string;
  isEnabled(): boolean;
}

// In-App Notification Channel
export class InAppNotificationChannel implements NotificationChannelStrategy {
  getName(): string {
    return 'in_app';
  }

  isEnabled(): boolean {
    return true; // Always enabled for MVP
  }

  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    try {
      // In-app notifications are "delivered" immediately
      // In a real implementation, this might push to websockets or message queues
      console.log(`📱 In-app notification delivered to ${user.email}: ${notification.title}`);
      
      return {
        success: true,
        metadata: {
          deliveredAt: new Date(),
          channel: 'in_app',
          userId: user.id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown delivery error'
      };
    }
  }
}

// Email Notification Channel (Future implementation)
export class EmailNotificationChannel implements NotificationChannelStrategy {
  getName(): string {
    return 'email';
  }

  isEnabled(): boolean {
    return false; // Disabled for MVP, but ready for future implementation
  }

  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    try {
      // TODO: Implement email delivery (SendGrid, AWS SES, etc.)
      console.log(`📧 Email notification would be sent to ${user.email}: ${notification.title}`);
      
      return {
        success: true,
        metadata: {
          deliveredAt: new Date(),
          channel: 'email',
          userId: user.id,
          emailAddress: user.email
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email delivery failed'
      };
    }
  }
}

// SMS Notification Channel (Future implementation)
export class SMSNotificationChannel implements NotificationChannelStrategy {
  getName(): string {
    return 'sms';
  }

  isEnabled(): boolean {
    return false; // Disabled for MVP, but ready for future implementation
  }

  async deliver(notification: Notification, user: User): Promise<DeliveryResult> {
    try {
      // TODO: Implement SMS delivery (Twilio, AWS SNS, etc.)
      console.log(`📱 SMS notification would be sent to ${user.name}: ${notification.title}`);
      
      return {
        success: true,
        metadata: {
          deliveredAt: new Date(),
          channel: 'sms',
          userId: user.id
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS delivery failed'
      };
    }
  }
}

// Factory Pattern: Notification Channel Factory
export class NotificationChannelFactory {
  private static channels: Map<string, new () => NotificationChannelStrategy> = new Map();

  static {
    // Register default channels
    this.register('in_app', InAppNotificationChannel);
    this.register('email', EmailNotificationChannel);
    this.register('sms', SMSNotificationChannel);
  }

  public static register(channelName: string, channelClass: new () => NotificationChannelStrategy): void {
    this.channels.set(channelName, channelClass);
  }

  public static create(channelName: string): NotificationChannelStrategy {
    const ChannelClass = this.channels.get(channelName);
    if (!ChannelClass) {
      throw new Error(`Notification channel '${channelName}' not found`);
    }
    return new ChannelClass();
  }

  public static getAvailableChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  public static getEnabledChannels(): NotificationChannelStrategy[] {
    return Array.from(this.channels.values())
      .map(ChannelClass => new ChannelClass())
      .filter(channel => channel.isEnabled());
  }
}

export default NotificationChannelFactory;