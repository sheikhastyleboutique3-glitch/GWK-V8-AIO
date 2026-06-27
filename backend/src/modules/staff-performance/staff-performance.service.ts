import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, Role } from '@prisma/client';

/**
 * Staff Performance Intelligence Engine.
 *
 * Aggregates metrics from existing order/KDS/session data to score each
 * staff member across multiple dimensions. Runs nightly (00:30) and stores
 * results for the dashboard. Can also be triggered on-demand.
 *
 * Metrics computed:
 *   Cashier: speed, avg ticket, void rate, upsell ratio
 *   Waiter: tables/shift, tips, avg table time, upsell
 *   Kitchen: prep time per station, overdue rate
 *   General: attendance (sessions opened), accuracy
 */

export interface StaffMetric {
  userId: number;
  userName: string;
  role: string;
  period: string; // 'daily' | 'weekly' | 'monthly'
  date: string;   // ISO date of the period start
  metrics: {
    // Cashier
    ordersCompleted?: number;
    avgTransactionTimeSec?: number;
    avgTicketSize?: number;
    totalRevenue?: number;
    voidCount?: number;
    voidRate?: number; // voids / total orders %
    refundCount?: number;
    itemsPerOrder?: number;
    combosSold?: number;
    modifiersAdded?: number;
    upsellScore?: number; // 0-100

    // Waiter
    tablesServed?: number;
    avgTableTimeMins?: number;
    tipsEarned?: number;
    tipRate?: number; // tips / revenue %

    // Kitchen
    avgPrepTimeMins?: number;
    overdueCount?: number;
    overdueRate?: number;
    itemsPrepared?: number;

    // General
    sessionsWorked?: number;
    hoursWorked?: number;
    cashVariance?: number;
  };
  score: number; // 0-100 composite score
  improvements: string[]; // AI-generated suggestions
}

export interface TeamReport {
  period: string;
  date: string;
  branchId?: number;
  teamAvg: {
    avgTransactionTimeSec: number;
    avgTicketSize: number;
    voidRate: number;
    avgPrepTimeMins: number;
    overdueRate: number;
  };
  topPerformers: StaffMetric[];
  needsImprovement: StaffMetric[];
  allStaff: StaffMetric[];
  trends: { metric: string; direction: 'up' | 'down' | 'stable'; change: number }[];
}

@Injectable()
export class StaffPerformanceService {
  private readonly logger = new Logger(StaffPerformanceService.name);
  // In-memory cache of latest report (production: store in DB table)
  private latestReport: TeamReport | null = null;
  private userReports = new Map<number, StaffMetric>();

  constructor(private prisma: PrismaService) {}

  /** Nightly cron: aggregate yesterday's performance data. */
  @Cron('30 0 * * *') // 00:30 every day
  async handleNightlyAggregation() {
    const enabled = await this.isEnabled();
    if (!enabled) return;
    this.logger.log('Running nightly staff performance aggregation...');
    try {
      await this.generateReport();
      this.logger.log('Staff performance report generated successfully.');
    } catch (e) {
      this.logger.error('Staff performance aggregation failed', e);
    }
  }

  async isEnabled(): Promise<boolean> {
    const setting = await this.prisma.setting.findUnique({ where: { key: 'staff_performance_enabled' } });
    return setting?.value !== 'false'; // enabled by default
  }

  async setEnabled(enabled: boolean) {
    await this.prisma.setting.upsert({
      where: { key: 'staff_performance_enabled' },
      update: { value: enabled ? 'true' : 'false' },
      create: { key: 'staff_performance_enabled', value: enabled ? 'true' : 'false' },
    });
  }

  /** Generate the full team report (on-demand or cron). */
  async generateReport(branchId?: number, period: 'daily' | 'weekly' | 'monthly' = 'daily'): Promise<TeamReport> {
    const now = new Date();
    const startDate = new Date(now);
    if (period === 'daily') startDate.setDate(startDate.getDate() - 1);
    else if (period === 'weekly') startDate.setDate(startDate.getDate() - 7);
    else startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(now);
    endDate.setHours(0, 0, 0, 0);

    // Fetch all users
    const users = await this.prisma.user.findMany({
      where: { isActive: true, ...(branchId ? { OR: [{ branchId }, { userBranches: { some: { branchId } } }] } : {}) },
      select: { id: true, firstName: true, lastName: true, role: true },
    });

    // Fetch all completed orders in the period
    const orders = await this.prisma.order.findMany({
      where: {
        completedAt: { gte: startDate, lt: endDate },
        status: OrderStatus.COMPLETED,
        ...(branchId ? { branchId } : {}),
      },
      include: {
        items: { select: { id: true, quantity: true, unitPrice: true, firedAt: true, readyAt: true, isVoided: true, modifiers: true, kdsStatus: true } },
        payments: { select: { method: true, amount: true, isReversed: true } },
      },
    });

    // Fetch voided orders
    const voidedOrders = await this.prisma.order.findMany({
      where: {
        updatedAt: { gte: startDate, lt: endDate },
        status: OrderStatus.VOIDED,
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, createdById: true },
    });

    // Fetch sessions
    const sessions = await this.prisma.posSession.findMany({
      where: {
        openedAt: { gte: startDate, lt: endDate },
        ...(branchId ? { branchId } : {}),
      },
      select: { id: true, openedById: true, closedById: true, openedAt: true, closedAt: true, cashDifference: true },
    });

    // Compute per-user metrics
    const staffMetrics: StaffMetric[] = [];

    for (const user of users) {
      const userOrders = orders.filter(o => o.createdById === user.id);
      const userVoids = voidedOrders.filter(o => o.createdById === user.id);
      const userSessions = sessions.filter(s => s.openedById === user.id);
      const totalOrders = userOrders.length;

      if (totalOrders === 0 && userSessions.length === 0) continue; // Skip inactive staff

      // ─── Cashier Metrics ───
      const totalRevenue = userOrders.reduce((s, o) => s + o.total, 0);
      const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      const totalItems = userOrders.reduce((s, o) => s + o.items.reduce((si, it) => si + it.quantity, 0), 0);
      const itemsPerOrder = totalOrders > 0 ? totalItems / totalOrders : 0;
      const voidCount = userVoids.length;
      const voidRate = totalOrders > 0 ? (voidCount / (totalOrders + voidCount)) * 100 : 0;

      // Transaction speed: time from order creation to completion
      const txTimes = userOrders
        .filter(o => o.completedAt && o.createdAt)
        .map(o => (new Date(o.completedAt!).getTime() - new Date(o.createdAt).getTime()) / 1000);
      const avgTxTime = txTimes.length > 0 ? txTimes.reduce((s, t) => s + t, 0) / txTimes.length : 0;

      // Modifiers/combos (upselling)
      const modCount = userOrders.reduce((s, o) => s + o.items.filter(it => {
        const mods = it.modifiers as any;
        return Array.isArray(mods) && mods.length > 0;
      }).length, 0);
      const upsellScore = Math.min(100, Math.round((modCount / Math.max(totalItems, 1)) * 100 + (avgTicket > 0 ? 20 : 0)));

      // ─── Waiter Metrics (from table orders) ───
      const tableOrders = userOrders.filter(o => o.tableName);
      const tablesServed = new Set(tableOrders.map(o => o.tableName)).size;
      const tips = userOrders.reduce((s, o) => s + (o.tip || 0), 0);
      const tipRate = totalRevenue > 0 ? (tips / totalRevenue) * 100 : 0;

      // ─── Kitchen Metrics (prep time from firedAt → readyAt) ───
      const allItems = userOrders.flatMap(o => o.items);
      const prepItems = allItems.filter(it => it.firedAt && it.readyAt);
      const prepTimes = prepItems.map(it => (new Date(it.readyAt!).getTime() - new Date(it.firedAt!).getTime()) / 60000);
      const avgPrepTime = prepTimes.length > 0 ? prepTimes.reduce((s, t) => s + t, 0) / prepTimes.length : 0;
      const overdueItems = prepTimes.filter(t => t > 10).length;
      const overdueRate = prepTimes.length > 0 ? (overdueItems / prepTimes.length) * 100 : 0;

      // ─── Attendance ───
      const hoursWorked = userSessions.reduce((s, sess) => {
        if (!sess.closedAt) return s;
        return s + (new Date(sess.closedAt).getTime() - new Date(sess.openedAt).getTime()) / 3600000;
      }, 0);
      const cashVariance = userSessions.reduce((s, sess) => s + Math.abs(sess.cashDifference || 0), 0);

      // ─── Composite Score (0-100) ───
      let score = 50; // baseline
      if (avgTxTime > 0 && avgTxTime < 120) score += 15; // fast transactions
      else if (avgTxTime > 300) score -= 10; // slow
      if (voidRate < 2) score += 10; // low voids
      else if (voidRate > 5) score -= 10; // high voids
      if (upsellScore > 30) score += 10; // good upselling
      if (tipRate > 5) score += 5; // good tips
      if (avgPrepTime > 0 && avgPrepTime < 8) score += 10; // fast kitchen
      else if (avgPrepTime > 15) score -= 10; // slow kitchen
      if (cashVariance < 5) score += 5; // accurate cash handling
      else if (cashVariance > 50) score -= 10; // poor cash handling
      score = Math.max(0, Math.min(100, score));

      // ─── Generate Improvement Suggestions ───
      const improvements: string[] = [];
      if (avgTxTime > 180) improvements.push('Transaction speed is slow — practice keyboard shortcuts (Enter=Pay, digits for qty)');
      if (voidRate > 5) improvements.push('High void rate — double-check items before firing to kitchen');
      if (upsellScore < 20) improvements.push('Low upselling — suggest modifiers/combos to customers (drinks, desserts, sides)');
      if (avgPrepTime > 12) improvements.push('Prep time above target — pre-prepare popular items during quiet periods');
      if (overdueRate > 20) improvements.push('Too many overdue tickets — prioritize QUEUED items before starting new ones');
      if (cashVariance > 20) improvements.push('Cash handling variance — count carefully at close, use denomination grid');
      if (tablesServed > 0 && tipRate < 2) improvements.push('Low tips — check back with tables after main course, be attentive');
      if (itemsPerOrder < 2) improvements.push('Low items/order — suggest appetizers, drinks, or desserts');
      if (improvements.length === 0) improvements.push('Great performance! Keep up the good work.');

      const metric: StaffMetric = {
        userId: user.id,
        userName: `${user.firstName} ${user.lastName}`,
        role: user.role,
        period,
        date: startDate.toISOString().slice(0, 10),
        metrics: {
          ordersCompleted: totalOrders,
          avgTransactionTimeSec: Math.round(avgTxTime),
          avgTicketSize: +avgTicket.toFixed(2),
          totalRevenue: +totalRevenue.toFixed(2),
          voidCount,
          voidRate: +voidRate.toFixed(1),
          itemsPerOrder: +itemsPerOrder.toFixed(1),
          modifiersAdded: modCount,
          upsellScore,
          tablesServed,
          avgTableTimeMins: 0, // TODO: compute from table occupancy
          tipsEarned: +tips.toFixed(2),
          tipRate: +tipRate.toFixed(1),
          avgPrepTimeMins: +avgPrepTime.toFixed(1),
          overdueCount: overdueItems,
          overdueRate: +overdueRate.toFixed(1),
          itemsPrepared: prepItems.length,
          sessionsWorked: userSessions.length,
          hoursWorked: +hoursWorked.toFixed(1),
          cashVariance: +cashVariance.toFixed(2),
        },
        score,
        improvements,
      };

      staffMetrics.push(metric);
      this.userReports.set(user.id, metric);
    }

    // Sort by score
    staffMetrics.sort((a, b) => b.score - a.score);

    // Team averages
    const withOrders = staffMetrics.filter(m => (m.metrics.ordersCompleted || 0) > 0);
    const teamAvg = {
      avgTransactionTimeSec: withOrders.length > 0 ? Math.round(withOrders.reduce((s, m) => s + (m.metrics.avgTransactionTimeSec || 0), 0) / withOrders.length) : 0,
      avgTicketSize: withOrders.length > 0 ? +(withOrders.reduce((s, m) => s + (m.metrics.avgTicketSize || 0), 0) / withOrders.length).toFixed(2) : 0,
      voidRate: withOrders.length > 0 ? +(withOrders.reduce((s, m) => s + (m.metrics.voidRate || 0), 0) / withOrders.length).toFixed(1) : 0,
      avgPrepTimeMins: withOrders.length > 0 ? +(withOrders.reduce((s, m) => s + (m.metrics.avgPrepTimeMins || 0), 0) / withOrders.length).toFixed(1) : 0,
      overdueRate: withOrders.length > 0 ? +(withOrders.reduce((s, m) => s + (m.metrics.overdueRate || 0), 0) / withOrders.length).toFixed(1) : 0,
    };

    const report: TeamReport = {
      period,
      date: startDate.toISOString().slice(0, 10),
      branchId,
      teamAvg,
      topPerformers: staffMetrics.filter(m => m.score >= 70).slice(0, 5),
      needsImprovement: staffMetrics.filter(m => m.score < 50 || m.improvements.length > 1).slice(0, 5),
      allStaff: staffMetrics,
      trends: [], // TODO: compare with previous period
    };

    this.latestReport = report;
    return report;
  }

  /** Get the cached report or generate fresh. */
  async getReport(branchId?: number, period?: 'daily' | 'weekly' | 'monthly'): Promise<TeamReport> {
    if (this.latestReport && !branchId && !period) return this.latestReport;
    return this.generateReport(branchId, period || 'daily');
  }

  /** Get individual staff scorecard. */
  async getUserReport(userId: number, branchId?: number): Promise<StaffMetric | null> {
    const cached = this.userReports.get(userId);
    if (cached) return cached;
    // Generate fresh
    await this.generateReport(branchId, 'daily');
    return this.userReports.get(userId) || null;
  }
}
