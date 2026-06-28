import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AlertsService } from './alerts.service';

@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name);

  constructor(private alertsService: AlertsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleAlerts() {
    try {
      await this.alertsService.generateExpiryAlerts();
    } catch (err) {
      this.logger.error(`Expiry alert generation failed: ${(err as Error).message}`, (err as Error).stack);
    }
    try {
      await this.alertsService.generateLowStockAlerts();
    } catch (err) {
      this.logger.error(`Low-stock alert generation failed: ${(err as Error).message}`, (err as Error).stack);
    }
  }
}
