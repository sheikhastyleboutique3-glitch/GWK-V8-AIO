import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus, Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private range(period?: string, from?: string, to?: string) {
    const now = new Date();
    let gte: Date | undefined;
    if (from) gte = new Date(from);
    else if (period === 'today') gte = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (period === 'week') gte = new Date(now.getTime() - 7 * 864e5);
    else if (period === 'month') gte = new Date(now.getFullYear(), now.getMonth(), 1);
    const lte = to ? new Date(to + 'T23:59:59.999Z') : undefined;
    return { gte, lte };
  }

  /** Headline sales metrics for the executive dashboard. */
  async salesSummary(opts: { branchId?: number; period?: string; from?: string; to?: string }) {
    const { gte, lte } = this.range(opts.period, opts.from, opts.to);
    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };

    const agg = await this.prisma.order.aggregate({
      where,
      _count: { _all: true },
      _sum: { total: true, foodCost: true, grossProfit: true, discountTotal: true, taxTotal: true },
      _avg: { total: true },
    });

    const revenue = agg._sum.total ?? 0;
    const foodCost = agg._sum.foodCost ?? 0;

    // Payment method mix (only payments on matching orders).
    const payMix = await this.prisma.payment.groupBy({
      by: ['method'],
      where: { order: where },
      _sum: { amount: true },
      _count: { _all: true },
    });

    return {
      orders: agg._count._all,
      revenue,
      foodCost,
      grossProfit: agg._sum.grossProfit ?? 0,
      foodCostPct: revenue ? (foodCost / revenue) * 100 : 0,
      avgTicket: agg._avg.total ?? 0,
      discountTotal: agg._sum.discountTotal ?? 0,
      taxTotal: agg._sum.taxTotal ?? 0,
      paymentMix: payMix.map((p) => ({
        method: p.method,
        amount: p._sum.amount ?? 0,
        count: p._count._all,
      })),
    };
  }

  async bestSellers(opts: { branchId?: number; period?: string; from?: string; to?: string; limit?: number }) {
    const { gte, lte } = this.range(opts.period, opts.from, opts.to);
    const orderWhere: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: orderWhere },
      _sum: { quantity: true, lineTotal: true, lineCost: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: opts.limit ?? 10,
    });
    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, sku: true, name: true, nameAr: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return grouped.map((g) => ({
      product: byId.get(g.productId) ?? { id: g.productId },
      quantity: g._sum.quantity ?? 0,
      revenue: g._sum.lineTotal ?? 0,
      cost: g._sum.lineCost ?? 0,
      grossProfit: (g._sum.lineTotal ?? 0) - (g._sum.lineCost ?? 0),
    }));
  }

  async topCustomers(opts: { branchId?: number; period?: string; from?: string; to?: string; limit?: number }) {
    const { gte, lte } = this.range(opts.period, opts.from, opts.to);
    const grouped = await this.prisma.order.groupBy({
      by: ['customerId'],
      where: {
        status: OrderStatus.COMPLETED,
        customerId: { not: null },
        ...(opts.branchId ? { branchId: opts.branchId } : {}),
        ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
      },
      _sum: { total: true },
      _count: { _all: true },
      orderBy: { _sum: { total: 'desc' } },
      take: opts.limit ?? 10,
    });
    const ids = grouped.map((g) => g.customerId).filter((x): x is number => x != null);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, phone: true, loyaltyPoints: true },
    });
    const byId = new Map(customers.map((c) => [c.id, c]));
    return grouped.map((g) => ({
      customer: g.customerId != null ? byId.get(g.customerId) ?? { id: g.customerId } : null,
      spend: g._sum.total ?? 0,
      orders: g._count._all,
    }));
  }

  /** Product Sales Report: quantities + revenue per product with category. */
  async productSalesReport(opts: { branchId?: number; period?: string; from?: string; to?: string }) {
    const { gte, lte } = this.range(opts.period, opts.from, opts.to);
    const orderWhere: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };
    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: orderWhere, isVoided: false },
      _sum: { quantity: true, lineTotal: true, lineCost: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
    });
    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, sku: true, name: true, nameAr: true, category: { select: { id: true, name: true, nameAr: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const items = grouped.map((g) => {
      const p = byId.get(g.productId);
      return {
        product: p ?? { id: g.productId, name: `#${g.productId}` },
        category: p?.category ?? null,
        quantity: g._sum.quantity ?? 0,
        revenue: g._sum.lineTotal ?? 0,
        cost: g._sum.lineCost ?? 0,
        grossProfit: (g._sum.lineTotal ?? 0) - (g._sum.lineCost ?? 0),
      };
    });

    // Category summary
    const byCat: Record<string, { name: string; nameAr?: string | null; qty: number; revenue: number; cost: number }> = {};
    for (const it of items) {
      const catName = it.category?.name ?? 'Uncategorized';
      if (!byCat[catName]) byCat[catName] = { name: catName, nameAr: it.category?.nameAr, qty: 0, revenue: 0, cost: 0 };
      byCat[catName].qty += it.quantity;
      byCat[catName].revenue += it.revenue;
      byCat[catName].cost += it.cost;
    }

    return {
      items,
      byCategory: Object.values(byCat).sort((a, b) => b.revenue - a.revenue),
      totalRevenue: items.reduce((s, i) => s + i.revenue, 0),
      totalCost: items.reduce((s, i) => s + i.cost, 0),
      totalQuantity: items.reduce((s, i) => s + i.quantity, 0),
    };
  }

  /** Staff Performance Report: orders, revenue, avg ticket per cashier/waiter. */
  async staffPerformance(opts: { branchId?: number; period?: string; from?: string; to?: string }) {
    const { gte, lte } = this.range(opts.period, opts.from, opts.to);
    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      createdById: { not: null },
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };
    const grouped = await this.prisma.order.groupBy({
      by: ['createdById'],
      where,
      _sum: { total: true, tip: true, grossProfit: true },
      _count: { _all: true },
      _avg: { total: true },
      orderBy: { _sum: { total: 'desc' } },
    });
    const userIds = grouped.map((g) => g.createdById).filter((x): x is number => x != null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return grouped.map((g) => ({
      user: g.createdById != null ? byId.get(g.createdById) ?? { id: g.createdById } : null,
      orders: g._count._all,
      revenue: g._sum.total ?? 0,
      tips: g._sum.tip ?? 0,
      grossProfit: g._sum.grossProfit ?? 0,
      avgTicket: g._avg.total ?? 0,
    }));
  }

  /** Tip Report: tips collected per staff member and per session. */
  async tipReport(opts: { branchId?: number; period?: string; from?: string; to?: string }) {
    const { gte, lte } = this.range(opts.period, opts.from, opts.to);
    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      tip: { gt: 0 },
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };

    // Per staff
    const byStaff = await this.prisma.order.groupBy({
      by: ['createdById'],
      where,
      _sum: { tip: true },
      _count: { _all: true },
      orderBy: { _sum: { tip: 'desc' } },
    });
    const userIds = byStaff.map((g) => g.createdById).filter((x): x is number => x != null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    // Per session
    const bySession = await this.prisma.order.groupBy({
      by: ['sessionId'],
      where: { ...where, sessionId: { not: null } },
      _sum: { tip: true },
      _count: { _all: true },
      orderBy: { _sum: { tip: 'desc' } },
    });
    const sessionIds = bySession.map((g) => g.sessionId).filter((x): x is number => x != null);
    const sessions = await this.prisma.posSession.findMany({
      where: { id: { in: sessionIds } },
      select: { id: true, sessionNo: true, openedAt: true },
    });
    const sessById = new Map(sessions.map((s) => [s.id, s]));

    const totalTips = byStaff.reduce((s, g) => s + (g._sum.tip ?? 0), 0);
    const totalOrders = byStaff.reduce((s, g) => s + g._count._all, 0);

    return {
      totalTips,
      totalOrders,
      avgTipPerOrder: totalOrders ? totalTips / totalOrders : 0,
      byStaff: byStaff.map((g) => ({
        user: g.createdById != null ? byId.get(g.createdById) : null,
        tips: g._sum.tip ?? 0,
        orders: g._count._all,
      })),
      bySession: bySession.map((g) => ({
        session: g.sessionId != null ? sessById.get(g.sessionId) : null,
        tips: g._sum.tip ?? 0,
        orders: g._count._all,
      })),
    };
  }

  /** Cash Reconciliation Report: all sessions with their cash variances. */
  async cashReconciliation(opts: { branchId?: number; from?: string; to?: string }) {
    const { gte, lte } = this.range(undefined, opts.from, opts.to);
    const where: Prisma.PosSessionWhereInput = {
      status: 'CLOSED',
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { closedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };
    const sessions = await this.prisma.posSession.findMany({
      where,
      select: {
        id: true,
        sessionNo: true,
        branchId: true,
        openedAt: true,
        closedAt: true,
        openingFloat: true,
        expectedCash: true,
        closingCounted: true,
        cashDifference: true,
        openedBy: { select: { firstName: true, lastName: true } },
        closedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { closedAt: 'desc' },
      take: 200,
    });

    const totalVariance = sessions.reduce((s, sess) => s + (sess.cashDifference ?? 0), 0);
    const sessionsWithVariance = sessions.filter((s) => s.cashDifference != null && s.cashDifference !== 0);

    return {
      sessions,
      totalSessions: sessions.length,
      totalVariance,
      avgVariance: sessions.length ? totalVariance / sessions.length : 0,
      sessionsWithVariance: sessionsWithVariance.length,
      maxShortage: sessions.reduce((min, s) => Math.min(min, s.cashDifference ?? 0), 0),
      maxOverage: sessions.reduce((max, s) => Math.max(max, s.cashDifference ?? 0), 0),
    };
  }

  // =========================================================================
  // ADVANCED ANALYTICS
  // =========================================================================

  /**
   * ABC Analysis — Pareto classification of products by revenue contribution.
   *
   * A = top products contributing 80% of total revenue (high-value, protect stock)
   * B = next 15% of revenue (moderate value, standard attention)
   * C = bottom 5% of revenue (low value, consider discontinuing)
   *
   * Returns each product with its class, cumulative %, revenue, quantity, and GP.
   */
  async abcAnalysis(opts: { branchId?: number; from?: string; to?: string }) {
    const { gte, lte } = this.range(undefined, opts.from, opts.to);
    const orderWhere: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };

    const grouped = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: orderWhere, isVoided: false },
      _sum: { lineTotal: true, lineCost: true, quantity: true },
      orderBy: { _sum: { lineTotal: 'desc' } },
    });

    const products = await this.prisma.product.findMany({
      where: { id: { in: grouped.map((g) => g.productId) } },
      select: { id: true, sku: true, name: true, nameAr: true, category: { select: { id: true, name: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const totalRevenue = grouped.reduce((s, g) => s + (g._sum.lineTotal ?? 0), 0);
    if (totalRevenue === 0) return { items: [], summary: { A: 0, B: 0, C: 0 }, totalRevenue: 0 };

    let cumulative = 0;
    const items = grouped.map((g) => {
      const revenue = g._sum.lineTotal ?? 0;
      const cost = g._sum.lineCost ?? 0;
      cumulative += revenue;
      const cumulativePct = (cumulative / totalRevenue) * 100;
      const revenuePct = (revenue / totalRevenue) * 100;

      let classification: 'A' | 'B' | 'C';
      if (cumulativePct <= 80) classification = 'A';
      else if (cumulativePct <= 95) classification = 'B';
      else classification = 'C';

      return {
        product: byId.get(g.productId) ?? { id: g.productId },
        classification,
        revenue,
        revenuePct: Math.round(revenuePct * 100) / 100,
        cumulativePct: Math.round(cumulativePct * 100) / 100,
        quantity: g._sum.quantity ?? 0,
        cost,
        grossProfit: revenue - cost,
        grossMarginPct: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 10000) / 100 : 0,
      };
    });

    const summary = {
      A: items.filter((i) => i.classification === 'A').length,
      B: items.filter((i) => i.classification === 'B').length,
      C: items.filter((i) => i.classification === 'C').length,
    };

    return { items, summary, totalRevenue, totalProducts: items.length };
  }

  /**
   * Waste vs Sales Ratio — Shows how much of each product/category is wasted
   * relative to how much is sold, helping identify over-ordering or spoilage patterns.
   *
   * Formula: wasteRatio = (wastedQty / (soldQty + wastedQty)) × 100
   * A ratio >10% suggests over-prep or storage issues.
   */
  async wasteVsSalesRatio(opts: { branchId?: number; from?: string; to?: string }) {
    const { gte, lte } = this.range(undefined, opts.from, opts.to);
    const dateFilter = gte || lte
      ? { createdAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } }
      : {};
    const branchFilter = opts.branchId ? { branchId: opts.branchId } : {};

    // Sold quantities per product (from completed orders)
    const orderWhere: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      ...branchFilter,
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };
    const sold = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: orderWhere, isVoided: false },
      _sum: { quantity: true, lineTotal: true },
    });
    const soldMap = new Map(sold.map((s) => [s.productId, { qty: s._sum.quantity ?? 0, revenue: s._sum.lineTotal ?? 0 }]));

    // Wasted quantities per product
    const wasted = await this.prisma.wastageRecord.groupBy({
      by: ['productId'],
      where: { ...branchFilter, ...dateFilter },
      _sum: { quantity: true },
      _count: { _all: true },
    });

    if (!wasted.length) return { items: [], byCategory: [], totals: { soldQty: 0, wastedQty: 0, wasteRatio: 0 } };

    const productIds = [...new Set([...sold.map((s) => s.productId), ...wasted.map((w) => w.productId)])];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, nameAr: true, sku: true, costPrice: true, category: { select: { id: true, name: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const items = wasted.map((w) => {
      const product = byId.get(w.productId);
      const soldData = soldMap.get(w.productId) || { qty: 0, revenue: 0 };
      const wastedQty = w._sum.quantity ?? 0;
      const totalUsage = soldData.qty + wastedQty;
      const wasteRatio = totalUsage > 0 ? (wastedQty / totalUsage) * 100 : 100;
      const wasteCost = wastedQty * (product?.costPrice ?? 0);

      return {
        product: product ?? { id: w.productId },
        category: product?.category,
        soldQty: soldData.qty,
        soldRevenue: soldData.revenue,
        wastedQty,
        wasteIncidents: w._count._all,
        wasteCost,
        wasteRatio: Math.round(wasteRatio * 100) / 100,
        severity: wasteRatio > 20 ? 'critical' : wasteRatio > 10 ? 'high' : wasteRatio > 5 ? 'medium' : 'low',
      };
    }).sort((a, b) => b.wasteRatio - a.wasteRatio);

    // Aggregate by category
    const catMap = new Map<string, { name: string; soldQty: number; wastedQty: number; wasteCost: number }>();
    for (const item of items) {
      const catName = item.category?.name ?? 'Uncategorized';
      const entry = catMap.get(catName) || { name: catName, soldQty: 0, wastedQty: 0, wasteCost: 0 };
      entry.soldQty += item.soldQty;
      entry.wastedQty += item.wastedQty;
      entry.wasteCost += item.wasteCost;
      catMap.set(catName, entry);
    }
    const byCategory = Array.from(catMap.values()).map((c) => ({
      ...c,
      wasteRatio: (c.soldQty + c.wastedQty) > 0
        ? Math.round((c.wastedQty / (c.soldQty + c.wastedQty)) * 10000) / 100
        : 0,
    })).sort((a, b) => b.wasteRatio - a.wasteRatio);

    const totalSold = items.reduce((s, i) => s + i.soldQty, 0);
    const totalWasted = items.reduce((s, i) => s + i.wastedQty, 0);

    return {
      items,
      byCategory,
      totals: {
        soldQty: totalSold,
        wastedQty: totalWasted,
        totalWasteCost: items.reduce((s, i) => s + i.wasteCost, 0),
        wasteRatio: (totalSold + totalWasted) > 0
          ? Math.round((totalWasted / (totalSold + totalWasted)) * 10000) / 100
          : 0,
      },
    };
  }

  /**
   * Peak Hour Heatmap — Order counts by hour × day-of-week.
   *
   * Returns a 7×24 matrix (7 days, 24 hours) with:
   * - Order count per cell
   * - Revenue per cell
   * - Avg ticket per cell
   *
   * Used for staffing decisions (e.g., "We need 3 people Thursday 12-2pm").
   */
  async peakHourHeatmap(opts: { branchId?: number; from?: string; to?: string }) {
    const { gte, lte } = this.range(undefined, opts.from, opts.to);
    const branchFilter = opts.branchId ? `AND o."branchId" = ${opts.branchId}` : '';
    const dateFilter = gte ? `AND o."completedAt" >= '${gte.toISOString()}'` : '';
    const dateFilter2 = lte ? `AND o."completedAt" <= '${lte.toISOString()}'` : '';

    // Raw SQL for hour/day extraction (PostgreSQL EXTRACT)
    const rows = await this.prisma.$queryRawUnsafe<
      Array<{ dow: number; hour: number; orders: bigint; revenue: number; avg_ticket: number }>
    >(`
      SELECT
        EXTRACT(DOW FROM o."completedAt") AS dow,
        EXTRACT(HOUR FROM o."completedAt") AS hour,
        COUNT(*)::bigint AS orders,
        COALESCE(SUM(o.total), 0) AS revenue,
        COALESCE(AVG(o.total), 0) AS avg_ticket
      FROM orders o
      WHERE o.status = 'COMPLETED'
        ${branchFilter}
        ${dateFilter}
        ${dateFilter2}
      GROUP BY EXTRACT(DOW FROM o."completedAt"), EXTRACT(HOUR FROM o."completedAt")
      ORDER BY dow, hour
    `);

    // Build 7×24 matrix
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const matrix: Array<{
      day: string;
      dayIndex: number;
      hours: Array<{ hour: number; orders: number; revenue: number; avgTicket: number }>;
    }> = dayNames.map((name, i) => ({
      day: name,
      dayIndex: i,
      hours: Array.from({ length: 24 }, (_, h) => ({ hour: h, orders: 0, revenue: 0, avgTicket: 0 })),
    }));

    let peakHour = { day: '', hour: 0, orders: 0 };
    let totalOrders = 0;

    for (const row of rows) {
      const dow = Number(row.dow);
      const hour = Number(row.hour);
      const orders = Number(row.orders);
      const revenue = Number(row.revenue);
      const avgTicket = Number(row.avg_ticket);

      if (matrix[dow]) {
        matrix[dow].hours[hour] = { hour, orders, revenue: Math.round(revenue * 100) / 100, avgTicket: Math.round(avgTicket * 100) / 100 };
      }
      totalOrders += orders;
      if (orders > peakHour.orders) {
        peakHour = { day: dayNames[dow], hour, orders };
      }
    }

    // Find the busiest 5 slots
    const allSlots = rows
      .map((r) => ({ day: dayNames[Number(r.dow)], hour: Number(r.hour), orders: Number(r.orders), revenue: Number(r.revenue) }))
      .sort((a, b) => b.orders - a.orders);

    return {
      matrix,
      peak: peakHour,
      busiestSlots: allSlots.slice(0, 5),
      quietestSlots: allSlots.filter(s => s.orders > 0).slice(-5).reverse(),
      totalOrders,
      avgOrdersPerHour: totalOrders > 0 ? Math.round(totalOrders / allSlots.filter(s => s.orders > 0).length) : 0,
    };
  }

  /**
   * Customer Lifetime Value (CLV) — RFM-style scoring.
   *
   * Scores each customer on three axes:
   * - Recency: days since last order (lower = better)
   * - Frequency: total order count (higher = better)
   * - Monetary: total spend (higher = better)
   *
   * Each axis is scored 1-5 (quintiles), combined into a CLV score 3-15.
   * Segments: Champions (13-15), Loyal (10-12), Potential (7-9), At Risk (4-6), Lost (3).
   */
  async customerLifetimeValue(opts: { branchId?: number; from?: string; to?: string; limit?: number }) {
    const { gte, lte } = this.range(undefined, opts.from, opts.to);
    const where: Prisma.OrderWhereInput = {
      status: OrderStatus.COMPLETED,
      customerId: { not: null },
      ...(opts.branchId ? { branchId: opts.branchId } : {}),
      ...(gte || lte ? { completedAt: { ...(gte ? { gte } : {}), ...(lte ? { lte } : {}) } } : {}),
    };

    // Get aggregated stats per customer
    const grouped = await this.prisma.order.groupBy({
      by: ['customerId'],
      where,
      _sum: { total: true },
      _count: { _all: true },
      _max: { completedAt: true },
      _min: { completedAt: true },
    });

    if (!grouped.length) return { customers: [], segments: {} };

    const customerIds = grouped.map((g) => g.customerId).filter((x): x is number => x != null);
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, phone: true, email: true, loyaltyPoints: true },
    });
    const custMap = new Map(customers.map((c) => [c.id, c]));

    const now = Date.now();
    const rfmData = grouped
      .filter((g) => g.customerId != null)
      .map((g) => {
        const lastOrder = g._max.completedAt ? new Date(g._max.completedAt).getTime() : 0;
        const firstOrder = g._min.completedAt ? new Date(g._min.completedAt).getTime() : now;
        return {
          customerId: g.customerId!,
          recencyDays: Math.floor((now - lastOrder) / 86400000),
          frequency: g._count._all,
          monetary: g._sum.total ?? 0,
          firstOrderDays: Math.floor((now - firstOrder) / 86400000),
        };
      });

    // Score each axis into quintiles (1-5)
    const sortedR = [...rfmData].sort((a, b) => a.recencyDays - b.recencyDays); // lower = better for recency
    const sortedF = [...rfmData].sort((a, b) => b.frequency - a.frequency);
    const sortedM = [...rfmData].sort((a, b) => b.monetary - a.monetary);

    const quintile = (sorted: typeof rfmData, item: typeof rfmData[0], key: keyof typeof item) => {
      const idx = sorted.findIndex((s) => s.customerId === item.customerId);
      const pct = idx / sorted.length;
      if (pct <= 0.2) return 5;
      if (pct <= 0.4) return 4;
      if (pct <= 0.6) return 3;
      if (pct <= 0.8) return 2;
      return 1;
    };

    const scored = rfmData.map((d) => {
      const rScore = quintile(sortedR, d, 'recencyDays');
      const fScore = quintile(sortedF, d, 'frequency');
      const mScore = quintile(sortedM, d, 'monetary');
      const clvScore = rScore + fScore + mScore;

      let segment: string;
      if (clvScore >= 13) segment = 'Champions';
      else if (clvScore >= 10) segment = 'Loyal';
      else if (clvScore >= 7) segment = 'Potential';
      else if (clvScore >= 4) segment = 'At Risk';
      else segment = 'Lost';

      return {
        customer: custMap.get(d.customerId) ?? { id: d.customerId },
        recencyDays: d.recencyDays,
        frequency: d.frequency,
        monetary: Math.round(d.monetary * 100) / 100,
        customerLifetimeDays: d.firstOrderDays,
        rScore,
        fScore,
        mScore,
        clvScore,
        segment,
        avgOrderValue: d.frequency > 0 ? Math.round((d.monetary / d.frequency) * 100) / 100 : 0,
        ordersPerMonth: d.firstOrderDays > 30 ? Math.round((d.frequency / (d.firstOrderDays / 30)) * 100) / 100 : d.frequency,
      };
    }).sort((a, b) => b.clvScore - a.clvScore || b.monetary - a.monetary);

    // Segment counts
    const segments: Record<string, number> = {};
    for (const s of scored) {
      segments[s.segment] = (segments[s.segment] || 0) + 1;
    }

    return {
      customers: scored.slice(0, opts.limit ?? 100),
      totalCustomers: scored.length,
      segments,
      avgClvScore: scored.length ? Math.round((scored.reduce((s, c) => s + c.clvScore, 0) / scored.length) * 10) / 10 : 0,
      totalRevenue: scored.reduce((s, c) => s + c.monetary, 0),
    };
  }
}
