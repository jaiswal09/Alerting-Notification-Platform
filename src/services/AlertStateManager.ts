import { Alert, AlertState, User, UserAlertPreference } from '../types/index.js';

// State Pattern: Alert State Management
export interface IAlertStateHandler {
  canDeliver(alert: Alert, user: User): boolean;
  getNextReminderTime(alert: Alert, lastDelivery?: Date): Date | null;
  shouldCreateReminder(alert: Alert, preference: UserAlertPreference): boolean;
}

// Active Alert State
export class ActiveAlertState implements IAlertStateHandler {
  canDeliver(alert: Alert, user: User): boolean {
    // Check if alert is within active time window
    const now = new Date();
    
    if (alert.startTime && now < alert.startTime) {
      return false; // Not started yet
    }
    
    if (alert.expiryTime && now > alert.expiryTime) {
      return false; // Expired
    }
    
    return true;
  }

  getNextReminderTime(alert: Alert, lastDelivery?: Date): Date | null {
    if (!alert.reminderEnabled) return null;
    
    const now = new Date();
    const reminderInterval = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '120');
    const nextReminder = new Date((lastDelivery || now).getTime() + reminderInterval * 60 * 1000);
    
    // Don't schedule reminder if alert will expire before next reminder
    if (alert.expiryTime && nextReminder > alert.expiryTime) {
      return null;
    }
    
    return nextReminder;
  }

  shouldCreateReminder(alert: Alert, preference: UserAlertPreference): boolean {
    // Create reminder if alert is active, reminder enabled, and user hasn't snoozed
    return alert.reminderEnabled && 
           !preference.isRead && 
           (!preference.snoozedUntil || preference.snoozedUntil < new Date());
  }
}

// Snoozed Alert State
export class SnoozedAlertState implements IAlertStateHandler {
  canDeliver(alert: Alert, user: User): boolean {
    return false; // Snoozed alerts cannot be delivered
  }

  getNextReminderTime(alert: Alert, lastDelivery?: Date): Date | null {
    // No reminders for snoozed alerts
    return null;
  }

  shouldCreateReminder(alert: Alert, preference: UserAlertPreference): boolean {
    return false; // No reminders for snoozed alerts
  }
}

// Expired Alert State
export class ExpiredAlertState implements IAlertStateHandler {
  canDeliver(alert: Alert, user: User): boolean {
    return false; // Expired alerts cannot be delivered
  }

  getNextReminderTime(alert: Alert, lastDelivery?: Date): Date | null {
    return null; // No reminders for expired alerts
  }

  shouldCreateReminder(alert: Alert, preference: UserAlertPreference): boolean {
    return false; // No reminders for expired alerts
  }
}

// Alert State Manager
export class AlertStateManager {
  private static stateHandlers: Map<AlertState, IAlertStateHandler> = new Map([
    [AlertState.ACTIVE, new ActiveAlertState()],
    [AlertState.SNOOZED, new SnoozedAlertState()],
    [AlertState.EXPIRED, new ExpiredAlertState()]
  ]);

  public static getState(alert: Alert, preference?: UserAlertPreference): AlertState {
    const now = new Date();
    
    // Check if expired
    if (alert.expiryTime && now > alert.expiryTime) {
      return AlertState.EXPIRED;
    }
    
    // Check if snoozed for this user
    if (preference?.snoozedUntil && preference.snoozedUntil > now) {
      return AlertState.SNOOZED;
    }
    
    // Check if not started yet or within active window
    if (alert.startTime && now < alert.startTime) {
      return AlertState.ACTIVE; // Will be filtered out by canDeliver
    }
    
    return AlertState.ACTIVE;
  }

  public static getStateHandler(state: AlertState): IAlertStateHandler {
    const handler = this.stateHandlers.get(state);
    if (!handler) {
      throw new Error(`No handler found for alert state: ${state}`);
    }
    return handler;
  }

  public static canDeliver(alert: Alert, user: User, preference?: UserAlertPreference): boolean {
    const state = this.getState(alert, preference);
    const handler = this.getStateHandler(state);
    return handler.canDeliver(alert, user);
  }

  public static getNextReminderTime(alert: Alert, preference?: UserAlertPreference, lastDelivery?: Date): Date | null {
    const state = this.getState(alert, preference);
    const handler = this.getStateHandler(state);
    return handler.getNextReminderTime(alert, lastDelivery);
  }

  public static shouldCreateReminder(alert: Alert, preference: UserAlertPreference): boolean {
    const state = this.getState(alert, preference);
    const handler = this.getStateHandler(state);
    return handler.shouldCreateReminder(alert, preference);
  }
}

export default AlertStateManager;