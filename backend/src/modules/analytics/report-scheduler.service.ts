import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

/**
 * Scheduled Report Delivery — Automatically emails reports on a schedule.
 *
 * Configurable via environment variables:
 *   WEEKLY_REPORT_ENABLED=true
 *   WEEKLY_REPORT_RECIPIENTS=manager@gwk.qa,owner@gwk.qa
 *   WEEKLY_REPORT_DAY=1 (Monday, 0=Sunday..6=Saturday)
 *   MONTHLY_REPORT_ENABLED=true
 *   MONTHLY_REPORT_RECIPIENTS=owner@gwk.qa
 *
 * Weekly: fires every Monday at 7:00 AM
 * Monthly: fires on the 1st of each month at 7:00 AM
 */
@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private analytics: AnalyticsService,
  ) {}

  /** Weekly report — Monday at 7:00 AM */
  @Cron('0 7 * * 1')
  async sendWeeklyReport() {
    if (this.config.get('WEEKLY_REPORT_ENABLED') === 'false') return;
    const recipients = this.config.get<string>('WEEKLY_REPORT_RECIPIENTS');
    if (!recipients) return;

    try {
      const to = new Date();
      const from = new Date(to.getTime() - 7 * 86400000);
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);

      const summary = await this.analytics.salesSummary({ from: fromStr, to: toStr });
      const bestSellers = await this.analytics.bestSellers({ from: fromStr, to: toStr, limit: 10 });
      const staffPerf = await this.analytics.staffPerformance({ from: fromStr, to: toStr });

      const html = this.buildReportHtml('Weekly Sales Report', `${fromStr} to ${toStr}`, summary, bestSellers, staffPerf);
      await this.sendEmail(recipients, `GWK Weekly Report — ${fromStr} to ${toStr}`, html);
      this.logger.log(`Weekly report sent to ${recipients}`);
    } catch (e) {
      this.logger.error('Weekly report failed', e);
    }
  }

  /** Monthly report — 1st of each month at 7:00 AM */
  @Cron('0 7 1 * *')
  async sendMonthlyReport() {
    if (this.config.get('MONTHLY_REPORT_ENABLED') === 'false') return;
    const recipients = this.config.get<string>('MONTHLY_REPORT_RECIPIENTS') || this.config.get<string>('WEEKLY_REPORT_RECIPIENTS');
    if (!recipients) return;

    try {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const to = new Date(now.getFullYear(), now.getMonth(), 0); // Last day of prev month
      const fromStr = from.toISOString().slice(0, 10);
      const toStr = to.toISOString().slice(0, 10);
      const monthName = from.toLocaleString('en', { month: 'long', year: 'numeric' });

      const summary = await this.analytics.salesSummary({ from: fromStr, to: toStr });
      const bestSellers = await this.analytics.bestSellers({ from: fromStr, to: toStr, limit: 15 });
      const staffPerf = await this.analytics.staffPerformance({ from: fromStr, to: toStr });

      const html = this.buildReportHtml(`Monthly Report — ${monthName}`, `${fromStr} to ${toStr}`, summary, bestSellers, staffPerf);
      await this.sendEmail(recipients, `GWK Monthly Report — ${monthName}`, html);
      this.logger.log(`Monthly report sent to ${recipients}`);
    } catch (e) {
      this.logger.error('Monthly report failed', e);
    }
  }

  private async sendEmail(recipients: string, subject: string, html: string) {
    let nodemailer: any;
    try { nodemailer = require('nodemailer'); } catch { this.logger.warn('nodemailer not installed'); return; }

    const transport = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST') || 'localhost',
      port: parseInt(this.config.get('SMTP_PORT') || '587', 10),
      secure: this.config.get('SMTP_SECURE') === 'true',
      auth: { user: this.config.get('SMTP_USER') || '', pass: this.config.get('SMTP_PASS') || '' },
    });

    await transport.sendMail({
      from: this.config.get('SMTP_FROM') || 'noreply@gwk.qa',
      to: recipients.split(',').map(e => e.trim()).filter(Boolean),
      subject,
      html,
    });
  }

  private buildReportHtml(title: string, period: string, summary: any, bestSellers: any[], staffPerf: any[]): string {
    const money = (v: number) => Number(v ?? 0).toFixed(2);
    return `
<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:system-ui,sans-serif;color:#1f2937;padding:20px;background:#f9fafb}
.card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
h1{color:#1a56db;font-size:22px;margin:0 0 4px}
h2{font-size:14px;color:#6b7280;margin:0 0 16px;font-weight:500}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.stat{background:#f3f4f6;border-radius:8px;padding:12px 16px;text-align:center;min-width:100px}
.stat-value{font-size:20px;font-weight:700;color:#1a56db}
.stat-label{font-size:11px;color:#6b7280;text-transform:uppercase;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{text-align:left;padding:6px 8px;background:#f9fafb;color:#6b7280;font-weight:600;border-bottom:1px solid #e5e7eb}
td{padding:6px 8px;border-bottom:1px solid #f3f4f6}
.footer{text-align:center;font-size:11px;color:#9ca3af;margin-top:20px}
</style></head><body>
<div class="card">
<h1>${title}</h1><h2>${period}</h2>
<div class="stats">
<div class="stat"><div class="stat-value">${summary.orders}</div><div class="stat-label">Orders</div></div>
<div class="stat"><div class="stat-value">${money(summary.revenue)}</div><div class="stat-label">Revenue</div></div>
<div class="stat"><div class="stat-value">${money(summary.grossProfit)}</div><div class="stat-label">Gross Profit</div></div>
<div class="stat"><div class="stat-value">${money(summary.avgTicket)}</div><div class="stat-label">Avg Ticket</div></div>
<div class="stat"><div class="stat-value">${summary.foodCostPct?.toFixed(1)}%</div><div class="stat-label">Food Cost</div></div>
</div>
</div>
<div class="card"><h2>Top Products</h2><table><tr><th>Product</th><th style="text-align:right">Qty</th><th style="text-align:right">Revenue</th><th style="text-align:right">GP</th></tr>
${bestSellers.map(b => `<tr><td>${b.product?.name ?? ''}</td><td style="text-align:right">${b.quantity}</td><td style="text-align:right">${money(b.revenue)}</td><td style="text-align:right">${money(b.grossProfit)}</td></tr>`).join('')}
</table></div>
<div class="card"><h2>Staff Performance</h2><table><tr><th>Staff</th><th style="text-align:right">Orders</th><th style="text-align:right">Revenue</th><th style="text-align:right">Avg Ticket</th></tr>
${staffPerf.map(s => `<tr><td>${s.user?.firstName ?? ''} ${s.user?.lastName ?? ''}</td><td style="text-align:right">${s.orders}</td><td style="text-align:right">${money(s.revenue)}</td><td style="text-align:right">${money(s.avgTicket)}</td></tr>`).join('')}
</table></div>
<div class="footer">Generated by GWK V8 AIO · ${new Date().toLocaleString()}</div>
</body></html>`;
  }
}
