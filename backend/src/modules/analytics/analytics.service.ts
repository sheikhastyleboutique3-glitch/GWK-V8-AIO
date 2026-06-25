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
}
