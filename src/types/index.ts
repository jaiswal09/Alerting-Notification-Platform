// Core Domain Types
export interface User {
    id: string;
    name: string;
    email: string;
    teamId?: string;
    role: UserRole;
    createdAt: Date;
  }
  
  export interface Team {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
  }
  
  export interface Alert {
    id: string;
    title: string;
    message: string;
    severity: AlertSeverity;
    visibilityType: VisibilityType;
    visibilityTarget?: string;
    startTime?: Date;
    expiryTime?: Date;
    reminderEnabled: boolean;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface NotificationDelivery {
    id: string;
    alertId: string;
    userId: string;
    channel: NotificationChannel;
    deliveredAt: Date;
    status: DeliveryStatus;
    metadata?: Record<string, unknown>;
  }
  
  export interface UserAlertPreference {
    id: string;
    userId: string;
    alertId: string;
    isRead: boolean;
    snoozedUntil?: Date;
    updatedAt: Date;
  }
  
  // Enums
  export enum UserRole {
    ADMIN = 'admin',
    USER = 'user'
  }
  
  export enum AlertSeverity {
    INFO = 'info',
    WARNING = 'warning',
    CRITICAL = 'critical'
  }
  
  export enum VisibilityType {
    ORGANIZATION = 'organization',
    TEAM = 'team',
    USER = 'user'
  }
  
  export enum NotificationChannel {
    IN_APP = 'in_app',
    EMAIL = 'email',
    SMS = 'sms'
  }
  
  export enum DeliveryStatus {
    PENDING = 'pending',
    DELIVERED = 'delivered',
    FAILED = 'failed',
    READ = 'read'
  }
  
  export enum AlertState {
    ACTIVE = 'active',
    SNOOZED = 'snoozed',
    EXPIRED = 'expired'
  }
  
  // API Request/Response Types
  export interface CreateAlertRequest {
    title: string;
    message: string;
    severity: AlertSeverity;
    visibilityType: VisibilityType;
    visibilityTarget?: string;
    startTime?: Date;
    expiryTime?: Date;
    reminderEnabled?: boolean;
  }
  
  export interface UpdateAlertRequest extends Partial<CreateAlertRequest> {
    id: string;
  }
  
  export interface UserAlertResponse extends Alert {
    isRead: boolean;
    snoozedUntil?: Date;
    deliveryCount: number;
    lastDelivered?: Date;
  }
  
  export interface AnalyticsResponse {
    totalAlerts: number;
    totalDeliveries: number;
    readRate: number;
    snoozeRate: number;
    severityBreakdown: Record<AlertSeverity, number>;
    deliveryStats: {
      delivered: number;
      failed: number;
      pending: number;
    };
    topAlerts: Array<{
      alertId: string;
      title: string;
      deliveryCount: number;
      readCount: number;
    }>;
  }
  
  // Service Interfaces
  export interface NotificationChannelStrategy { // Renamed from INotificationChannel
    deliver(notification: Notification, user: User): Promise<DeliveryResult>;
    getName(): string;
    isEnabled(): boolean;
  }
  
  export interface IAlertState {
    canDeliver(): boolean;
    getNextReminderTime(): Date | null;
    transition(newState: AlertState): void;
  }
  
  export interface IUserSubscription {
    subscribe(userId: string, alertId: string): void;
    unsubscribe(userId: string, alertId: string): void;
    getSubscribers(alertId: string): string[];
  }
  
  // Utility Types
  export interface DeliveryResult {
    success: boolean;
    error?: string;
    metadata?: Record<string, unknown>;
  }
  
  export interface Notification {
    id: string;
    alertId: string;
    title: string;
    message: string;
    severity: AlertSeverity;
    createdAt: Date;
  }
  
  export interface DatabaseConfig {
    url: string;
    maxConnections?: number;
    timeout?: number;
  }
  
  export interface AuthenticatedRequest extends Express.Request {
    user?: User;
  }
  
  // Configuration Types
  export interface AppConfig {
    port: number;
    jwtSecret: string;
    jwtExpiresIn: string;
    reminderIntervalMinutes: number;
    defaultSnoozeHours: number;
    corsOrigin: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
  }