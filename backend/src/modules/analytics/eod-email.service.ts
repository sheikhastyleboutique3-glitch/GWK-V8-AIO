import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from './analytics.service';
import { PosSessionsService } from '../pos-sessions/pos-sessions.service';
import * as nodemailer from 'nodemailer';

/**
 * End-of-Day Email Report.
 *
 * Runs every night at 23:55 (configurable) and emails a summary of the
 * day's sales to all managers. Requires SMTP settings in env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
 *   EOD_EMAIL_RECIPIENTS (comma-separated, e.g. manager@gwk.qa,owner@gwk.qa)
 *
 * Can also be triggered manually via POST /analytics/send-eod-email.
 */
@Injectable()
export class EodEmailService {
  private readonly logger = new Logger(EodEmailService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private analytics: AnalyticsService,
  ) {}

  /** Scheduled: fires at 23:55 every day. */
  @Cron('55 23 * * *')
  async handleDailyEmail() {
    const enabled = this.config.get<string>('EOD_EMAIL_ENABLED');
    if (enabled === 'false') return;
    try {
      await this.sendEodEmail();
    } catch (e) {
      this.logger.error('EOD email failed', e);
    }
  }

  /** Public method — callable from controller for manual trigger. */
  async sendEodEmail(dateOverride?: string) {
    const recipients = this.config.get<string>('EOD_EMAIL_RECIPIENTS');
    if (!recipients) {
      this.logger.warn('EOD_EMAIL_RECIPIENTS not configured; skipping.');
      return { sent: false, reason: 'No recipients configured' };
    }

    const today = dateOverride || new Date().toISOString().slice(0, 10);
    const summary = await this.analytics.salesSummary({ period: 'today' });
    const bestSellers = await this.analytics.bestSellers({ period: 'today', limit: 5 });
    const staffPerf = await this.analytics.staffPerformance({ period: 'today' });

    // Get closed sessions for today
    const sessions = await this.prisma.posSession.findMany({
      where: {
        status: 'CLOSED',
        closedAt: { gte: new Date(today + 'T00:00:00Z'), lte: new Date(today + 'T23:59:59.999Z') },
      },
      select: { sessionNo: true, openingFloat: true, expectedCash: true, closingCounted: true, cashDifference: true },
    });

    const html = this.buildEmailHtml(today, summary, bestSellers, staffPerf, sessions);

    const transport = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST') || 'localhost',
      port: parseInt(this.config.get<string>('SMTP_PORT') || '587', 10),
      secure: this.config.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.config.get<string>('SMTP_USER') || '',
        pass: this.config.get<string>('SMTP_PASS') || '',
      },
    });

    const from = this.config.get<string>('SMTP_FROM') || 'noreply@gwk.qa';
    const to = recipients.split(',').map((e) => e.trim()).filter(Boolean);

    await transport.sendMail({
      from,
      to,
      subject: `GWK Daily Sales Summary — ${today}`,
      html,
    });

    this.logger.log(`EOD email sent to ${to.length} recipient(s) for ${today}`);
    return { sent: true, recipients: to, date: today };
  }

  private buildEmailHtml(
    date: string,
    summary: any,
    bestSellers: any[],
    staffPerf: any[],
    sessions: any[],
  ): string {
    const money = (v: number) => Number(v ?? 0).toFixed(2);
    const totalVariance = sessions.reduce((s, sess) => s + (sess.cashDifference ?? 0), 0);

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937; margin: 0; padding: 20px; background: #f9fafb; }
.card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
h1 { color: #1a56db; font-size: 22px; margin: 0 0 4px; }
h2 { font-size: 14px; color: #6b7280; margin: 0 0 16px; font-weight: 500; }
h3 { font-size: 14px; color: #1f2937; margin: 16px 0 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
.stats { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.stat { background: #f3f4f6; border-radius: 8px; padding: 12px 16px; text-align: center; min-width: 100px; }
.stat-value { font-size: 20px; font-weight: 700; color: #1a56db; }
.stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; margin-top: 2px; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { text-align: left; padding: 6px 8px; background: #f9fafb; color: #6b7280; font-weight: 600; border-bottom: 1px solid #e5e7eb; }
td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; }
.green { color: #059669; }
.red { color: #dc2626; }
.footer { text-align: center; font-size: 11px; color: #9ca3af; margin-top: 20px; }
</style></head>
<body>
<div class="card">
  <h1>GWK Daily Sales Summary</h1>
  <h2>${date}</h2>
  <div class="stats">
    <div class="stat"><div class="stat-value">${summary.orders}</div><div class="stat-label">Orders</div></div>
    <div class="stat"><div class="stat-value">${money(summary.revenue)}</div><div class="stat-label">Revenue</div></div>
    <div class="stat"><div class="stat-value green">${money(summary.grossProfit)}</div><div class="stat-label">Gross Profit</div></div>
    <div class="stat"><div class="stat-value">${money(summary.avgTicket)}</div><div class="stat-label">Avg Ticket</div></div>
    <div class="stat"><div class="stat-value">${summary.foodCostPct?.toFixed(1) ?? 0}%</div><div class="stat-label">Food Cost %</div></div>
  </div>

  <h3>Payment Methods</h3>
  <table>
    <tr><th>Method</th><th style="text-align:right">Amount</th><th style="text-align:right">Count</th></tr>
    ${(summary.paymentMix || []).map((p: any) => `<tr><td>${p.method.replace(/_/g, ' ')}</td><td style="text-align:right">${money(p.amount)}</td><td style="text-align:right">${p.count}</td></tr>`).join('')}
  </table>
</div>

<div class="card">
  <h3>Top 5 Products</h3>
  <table>
    <tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Revenue</th></tr>
    ${bestSellers.slice(0, 5).map((b: any) => `<tr><td>${b.product?.name ?? ''}</td><td style="text-align:right">${b.quantity}</td><td style="text-align:right">${money(b.revenue)}</td></tr>`).join('')}
  </table>
</div>

<div class="card">
  <h3>Staff Performance</h3>
  <table>
    <tr><th>Staff</th><th style="text-align:right">Orders</th><th style="text-align:right">Revenue</th><th style="text-align:right">Tips</th></tr>
    ${staffPerf.map((s: any) => `<tr><td>${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}</td><td style="text-align:right">${s.orders}</td><td style="text-align:right">${money(s.revenue)}</td><td style="text-align:right">${money(s.tips)}</td></tr>`).join('')}
  </table>
</div>

${sessions.length ? `
<div class="card">
  <h3>Cash Reconciliation</h3>
  <table>
    <tr><th>Session</th><th style="text-align:right">Expected</th><th style="text-align:right">Counted</th><th style="text-align:right">Variance</th></tr>
    ${sessions.map((s: any) => `<tr><td>${s.sessionNo}</td><td style="text-align:right">${money(s.expectedCash)}</td><td style="text-align:right">${money(s.closingCounted)}</td><td style="text-align:right" class="${(s.cashDifference ?? 0) < 0 ? 'red' : 'green'}">${money(s.cashDifference)}</td></tr>`).join('')}
    <tr><th>TOTAL VARIANCE</th><th></th><th></th><th style="text-align:right" class="${totalVariance < 0 ? 'red' : 'green'}">${money(totalVariance)}</th></tr>
  </table>
</div>` : ''}

<div class="footer">
  Generated by GWK V8 AIO &middot; ${new Date().toLocaleString()}
</div>
</body>
</html>`;
  }
}
