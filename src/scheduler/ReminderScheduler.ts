import NotificationService from '../services/NotificationService.js';

export class ReminderScheduler {
  private notificationService: NotificationService;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.notificationService = new NotificationService();
  }

  /**
   * Start the reminder scheduler
   */
  public start(): void {
    if (this.isRunning) {
      console.log('⚠️ Reminder scheduler is already running');
      return;
    }

    const intervalMinutes = parseInt(process.env.REMINDER_INTERVAL_MINUTES || '120');
    const intervalMs = intervalMinutes * 60 * 1000;

    console.log(`🔄 Starting reminder scheduler (every ${intervalMinutes} minutes)`);

    // Process reminders immediately on start
    this.processReminders();

    // Set up recurring processing
    this.intervalId = setInterval(() => {
      this.processReminders();
    }, intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop the reminder scheduler
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Reminder scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('⏹️ Reminder scheduler stopped');
  }

  /**
   * Process all pending reminders
   */
  private async processReminders(): Promise<void> {
    try {
      console.log('🔔 Processing reminders...');
      await this.notificationService.processReminders();
      console.log('✅ Reminders processed successfully');
    } catch (error) {
      console.error('❌ Failed to process reminders:', error);
    }
  }

  /**
   * Get scheduler status
   */
  public getStatus(): { isRunning: boolean; intervalMinutes: number } {
    return {
      isRunning: this.isRunning,
      intervalMinutes: parseInt(process.env.REMINDER_INTERVAL_MINUTES || '120')
    };
  }
}

export default ReminderScheduler;