import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

// UTF-8 BOM for proper Arabic display in Excel
const UTF8_BOM = '\uFEFF';

/**
 * RFC-4180 compliant CSV field serializer.
 * Wraps a value in double quotes ONLY when it contains a comma, double quote,
 * slash, or newline, and escapes embedded double quotes by doubling them.
 * This prevents item descriptions like `Chicken, frozen`, `12" pan`, or
 * `a/b` from breaking the spreadsheet column layout.
 */
const field = (v: unknown): string => {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n\r/]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/** Join an array of cell values into a single, fully-escaped CSV row (CRLF terminated). */
const row = (cells: unknown[]): string => cells.map(field).join(',') + '\r\n';

export interface ExportFilters {
  branchId?: number;
  from?: string;
  to?: string;
  search?: string;
  status?: string;
  supplierId?: number;
  categoryId?: number;
  reason?: string;
  priority?: string;
  department?: string;
  productId?: number;
  logic?: 'AND' | 'OR'; // Odoo-style: OR combines filter conditions with OR instead of AND
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async wastageSummary(branchId?: number, from?: string, to?: string) {
    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }
    const [byReason, byBranch, total] = await Promise.all([
      this.prisma.wastageRecord.groupBy({ by: ['reason'], where, _sum: { quantity: true }, _count: true }),
      this.prisma.wastageRecord.groupBy({ by: ['branchId'], where, _sum: { quantity: true }, _count: true }),
      this.prisma.wastageRecord.aggregate({ where, _sum: { quantity: true }, _count: true }),
    ]);
    
    // Get branch names for the summary
    const branchIds = byBranch.map(b => b.branchId);
    const branches = await this.prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true, nameAr: true },
    });
    
    const byBranchWithNames = byBranch.map(b => ({
      ...b,
      branch: branches.find(br => br.id === b.branchId),
    }));
    
    return { byReason, byBranch: byBranchWithNames, total };
  }

  async costVariance(branchId?: number) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, costPrice: { gt: 0 } },
      include: { category: { select: { name: true, nameAr: true } } },
    });
    const poItems = await this.prisma.purchaseOrderItem.findMany({
      include: { product: { select: { id: true, costPrice: true } } },
    });
    return products
      .map((p) => {
        const purchases = poItems.filter((i) => i.productId === p.id);
        const avgActual = purchases.length
          ? purchases.reduce((s, i) => s + i.unitPrice, 0) / purchases.length
          : 0;
        return {
          productId: p.id,
          name: p.name,
          nameAr: p.nameAr,
          category: p.category?.name,
          categoryAr: p.category?.nameAr,
          baseCost: p.costPrice,
          avgActualCost: Math.round(avgActual * 100) / 100,
          variance: Math.round((avgActual - p.costPrice) * 100) / 100,
          variancePercent: p.costPrice > 0 ? Math.round(((avgActual - p.costPrice) / p.costPrice) * 10000) / 100 : 0,
        };
      })
      .filter((v) => v.avgActualCost > 0);
  }

  async highConsumption(branchId?: number, limit = 10) {
    const where: any = { type: 'REQUISITION_FULFILLMENT' };
    if (branchId) where.branchId = branchId;
    const result = await this.prisma.inventoryTransaction.groupBy({
      by: ['productId'],
      where,
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });
    const productIds = result.map((r) => r.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, nameAr: true, sku: true, costPrice: true },
    });
    return result.map((r) => {
      const product = products.find((p) => p.id === r.productId);
      return {
        ...r,
        product,
        totalValue: product ? Math.round((r._sum?.quantity || 0) * product.costPrice * 100) / 100 : 0,
      };
    });
  }

  /**
   * CSV export with optional date-range filter (from / to ISO strings).
   * Requisitions and POs are expanded to full line-item rows for detail.
   * All exports include UTF-8 BOM for proper Arabic display.
   */
  /**
   * Requirement #2: per-location financial summary for the dashboard filter.
   * branchId omitted  -> "All Branches" (whole company)
   * branchId provided -> Central Warehouse OR a specific branch.
   * Returns Current Item Stock Value (sum of qty x latest unit cost) and the
   * branch Cash Float (petty cash). Stock value uses the latest batch unitCost
   * when available, falling back to the product master costPrice.
   */
  async financials(branchId?: number) {
    const inventory = await this.prisma.inventory.findMany({
      where: { ...(branchId ? { branchId } : {}), quantity: { gt: 0 } },
      include: {
        product: { select: { costPrice: true } },
        batch: { select: { unitCost: true } },
      },
    });

    const stockValue = inventory.reduce((sum, i) => {
      const unitCost = i.batch?.unitCost || i.product.costPrice || 0;
      return sum + i.quantity * unitCost;
    }, 0);

    // Cash float: a single branch's float, or the sum across all active branches.
    let cashFloat = 0;
    if (branchId) {
      const b = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { cashFloat: true } });
      cashFloat = b?.cashFloat ?? 0;
    } else {
      const agg = await this.prisma.branch.aggregate({ where: { isActive: true }, _sum: { cashFloat: true } });
      cashFloat = agg._sum.cashFloat ?? 0;
    }

    return {
      branchId: branchId ?? null,
      stockValue: Math.round(stockValue * 100) / 100,
      cashFloat: Math.round(cashFloat * 100) / 100,
      lineItems: inventory.length,
    };
  }

  async exportCsv(type: string, opts: ExportFilters = {}): Promise<string> {
    const { branchId, from, to, search, status, supplierId, categoryId, reason, priority, department, productId, logic } = opts;
    const useOR = logic === 'OR';
    const dateFilter = (from || to)
      ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}) } }
      : {};

    // Reusable product sub-filter (mirrors the inventory/wastage list endpoints)
    const productWhere: any = {};
    if (search) productWhere.OR = [
      { name:   { contains: search, mode: 'insensitive' } },
      { nameAr: { contains: search, mode: 'insensitive' } },
      { sku:    { contains: search, mode: 'insensitive' } },
    ];
    if (categoryId) productWhere.categoryId = categoryId;
    if (supplierId) productWhere.supplierId = supplierId;
    const hasProductWhere = Object.keys(productWhere).length > 0;

    /**
     * OR-logic helper: when _logic=OR, instead of ANDing all conditions,
     * we wrap each non-empty condition in an OR array so any one match counts.
     * branchId is always AND (scope constraint) — only the filter conditions go into OR.
     */
    const buildOrWhere = (conditions: Record<string, any>[]): any => {
      const nonEmpty = conditions.filter(c => Object.keys(c).length > 0);
      if (!nonEmpty.length) return {};
      if (!useOR || nonEmpty.length === 1) {
        // AND mode (default): merge all conditions into one where object
        return Object.assign({}, ...nonEmpty);
      }
      // OR mode: each condition becomes an OR branch
      return { OR: nonEmpty };
    };

    switch (type) {
      case 'sales-orders': {
        const filterConditions = [
          ...(status ? [{ status: status as any }] : []),
          ...(from || to ? [{ completedAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}) } }] : []),
          ...(search ? [{ orderNo: { contains: search, mode: 'insensitive' } }] : []),
        ];
        const where = {
          ...(branchId ? { branchId } : {}),
          ...buildOrWhere(filterConditions),
        };
        const data = await this.prisma.order.findMany({
          where,
          include: {
            items: { include: { product: { select: { name: true, nameAr: true, sku: true, category: { select: { name: true } } } } } },
            payments: true,
            customer: { select: { name: true, phone: true } },
            branch: { select: { name: true } },
            createdBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        // Line-item expansion: each product gets its own CSV row (like Odoo)
        let csv = UTF8_BOM + row(['OrderNo','Branch','Status','Channel','Table','Customer','CustomerPhone','CreatedBy','CreatedAt','CompletedAt','SKU','ProductName','ProductNameAr','Category','Qty','UnitPrice','Discount','LineTotal','Modifiers','Notes','OrderSubtotal','OrderDiscount','OrderTax','OrderServiceCharge','OrderTip','OrderTotal','OrderPaid','FoodCost','GrossProfit','PaymentMethods']);
        for (const o of data) {
          const methods = (o.payments || []).filter((p: any) => !p.isReversed).map((p: any) => `${p.method}:${p.amount}`).join('; ');
          const base = [o.orderNo, o.branch?.name || '', o.status, o.channel, o.tableName || '', o.customer?.name || '', o.customer?.phone || '', o.createdBy ? `${o.createdBy.firstName} ${o.createdBy.lastName}` : '', o.createdAt.toISOString(), o.completedAt?.toISOString() || ''];
          const orderTotals = [o.subtotal, o.discountTotal, o.taxTotal, o.serviceCharge, o.tip, o.total, o.paidTotal, o.foodCost, o.grossProfit, methods];
          if (o.items.length === 0) {
            csv += row([...base, '', '', '', '', '', '', '', '', '', '', ...orderTotals]);
          } else {
            for (const item of o.items) {
              const mods = Array.isArray(item.modifiers) ? (item.modifiers as any[]).map((m: any) => m?.name || m?.nameAr || '').filter(Boolean).join(', ') : '';
              csv += row([...base, item.product?.sku || '', item.product?.name || '', item.product?.nameAr || '', (item.product as any)?.category?.name || '', item.quantity, item.unitPrice, item.discount, item.lineTotal, mods, item.notes || '', ...orderTotals]);
            }
          }
        }
        return csv;
      }

      case 'customers': {
        const data = await this.prisma.customer.findMany({
          where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { phone: { contains: search } }, { email: { contains: search, mode: 'insensitive' } }] } : undefined,
          orderBy: { name: 'asc' },
        });
        let csv = UTF8_BOM + row(['ID','Name','Phone','Email','LoyaltyPoints','CreditBalance','TotalSpent','OrderCount','CreatedAt']);
        for (const c of data) {
          csv += row([c.id, c.name, c.phone || '', c.email || '', c.loyaltyPoints, c.creditBalance, c.totalSpent, c.orderCount, c.createdAt.toISOString()]);
        }
        return csv;
      }

      case 'tax-report': {
        const entries = await this.prisma.financeEntry.findMany({
          where: { type: 'TAX', ...(branchId ? { branchId } : {}), ...(from || to ? { occurredAt: { ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}) } } : {}) },
          orderBy: { occurredAt: 'desc' },
          take: 5000,
        });
        let csv = UTF8_BOM + row(['ID','Date','Amount','Reference','SourceType','SourceId','BranchId','Notes']);
        for (const e of entries) {
          csv += row([e.id, e.occurredAt.toISOString(), e.amount, e.reference || '', e.sourceType || '', e.sourceId || '', e.branchId || '', e.notes || '']);
        }
        return csv;
      }

      case 'requisitions': {
        const data = await this.prisma.requisition.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            ...dateFilter,
            ...(status ? { status: status as any } : {}),
            ...(priority ? { priority: priority as any } : {}),
            ...(department ? { department } : {}),
            ...(search ? {
              OR: [
                { requisitionNo: { contains: search, mode: 'insensitive' } },
                { items: { some: { product: { OR: [
                  { name:   { contains: search, mode: 'insensitive' } },
                  { nameAr: { contains: search, mode: 'insensitive' } },
                  { sku:    { contains: search, mode: 'insensitive' } },
                ] } } } },
              ],
            } : {}),
          },
          include: {
            branch: { select: { name: true, nameAr: true } },
            createdBy: { select: { firstName: true, lastName: true } },
            reviewedBy: { select: { firstName: true, lastName: true } },
            items: {
              include: {
                product: { select: { name: true, nameAr: true, sku: true, costPrice: true } },
                unit: { select: { abbreviation: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        let csv = UTF8_BOM + row(['RequisitionNo','Branch','BranchAr','Department','Status','Priority','CreatedBy','ReviewedBy','CreatedAt','NeededBy','SKU','ProductName','ProductNameAr','RequestedQty','ApprovedQty','ReceivedQty','Unit','UnitCost','LineTotalCost']);
        for (const r of data) {
          const createdBy = `${r.createdBy.firstName} ${r.createdBy.lastName}`;
          const reviewedBy = r.reviewedBy ? `${r.reviewedBy.firstName} ${r.reviewedBy.lastName}` : '';
          if (r.items.length === 0) {
            csv += row([r.requisitionNo, r.branch.name, r.branch.nameAr, r.department, r.status, r.priority, createdBy, reviewedBy, r.createdAt.toISOString(), r.neededBy?.toISOString() || '', '', '', '', '', '', '', '', '', '']);
          } else {
            for (const item of r.items) {
              const unitCost = item.product.costPrice ?? 0;
              const qty = item.approvedQty ?? item.requestedQty;
              csv += row([r.requisitionNo, r.branch.name, r.branch.nameAr, r.department, r.status, r.priority, createdBy, reviewedBy, r.createdAt.toISOString(), r.neededBy?.toISOString() || '', item.product.sku, item.product.name, item.product.nameAr, item.requestedQty, item.approvedQty ?? '', item.receivedQty ?? '', item.unit?.abbreviation || '', unitCost, Math.round(qty * unitCost * 100) / 100]);
            }
          }
        }
        return csv;
      }

      case 'inventory': {
        const data = await this.prisma.inventory.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            ...(hasProductWhere ? { product: productWhere } : {}),
          },
          include: {
            product: {
              select: { name: true, nameAr: true, sku: true, costPrice: true, minStockLevel: true, reorderPoint: true },
              include: { unit: { select: { abbreviation: true } }, category: { select: { name: true, nameAr: true } } },
            },
            branch: { select: { name: true, nameAr: true } },
          },
          orderBy: [{ branch: { name: 'asc' } }, { product: { name: 'asc' } }],
        });
        let csv = UTF8_BOM + row(['SKU','ProductName','ProductNameAr','Category','CategoryAr','Branch','BranchAr','Quantity','Unit','CostPrice','StockValue','MinStockLevel','ReorderPoint','ExpiryDate','BatchNumber','Status']);
        for (const i of data) {
          const stockValue = Math.round(i.quantity * (i.product.costPrice ?? 0) * 100) / 100;
          const status = i.quantity <= 0 ? 'OUT_OF_STOCK' : i.quantity <= i.product.minStockLevel ? 'LOW_STOCK' : 'OK';
          csv += row([i.product.sku, i.product.name, i.product.nameAr, (i.product as any).category?.name || '', (i.product as any).category?.nameAr || '', i.branch.name, i.branch.nameAr, i.quantity, (i.product as any).unit?.abbreviation || '', i.product.costPrice, stockValue, i.product.minStockLevel, i.product.reorderPoint, i.expiryDate?.toISOString() || '', i.batchNumber || '', status]);
        }
        return csv;
      }

      case 'expiry-alerts': {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() + 30); // Items expiring within 30 days
        const data = await this.prisma.inventory.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            expiryDate: { lte: cutoff },
            quantity: { gt: 0 },
          },
          include: {
            product: {
              select: { name: true, nameAr: true, sku: true, costPrice: true },
              include: { unit: { select: { abbreviation: true } }, category: { select: { name: true, nameAr: true } } },
            },
            branch: { select: { name: true, nameAr: true } },
          },
          orderBy: { expiryDate: 'asc' },
        });
        let csv = UTF8_BOM + row(['SKU','ProductName','ProductNameAr','Category','Branch','BranchAr','Quantity','Unit','ExpiryDate','DaysUntilExpiry','StockValue','BatchNumber']);
        const now = new Date();
        for (const i of data) {
          const daysUntilExpiry = i.expiryDate ? Math.ceil((i.expiryDate.getTime() - now.getTime()) / 86400000) : '';
          const stockValue = Math.round(i.quantity * (i.product.costPrice ?? 0) * 100) / 100;
          csv += row([i.product.sku, i.product.name, i.product.nameAr, (i.product as any).category?.name || '', i.branch.name, i.branch.nameAr, i.quantity, (i.product as any).unit?.abbreviation || '', i.expiryDate?.toISOString() || '', daysUntilExpiry, stockValue, i.batchNumber || '']);
        }
        return csv;
      }

      case 'low-stock': {
        const inventory = await this.prisma.inventory.findMany({
          where: branchId ? { branchId } : undefined,
          include: {
            product: {
              select: { name: true, nameAr: true, sku: true, costPrice: true, minStockLevel: true, reorderPoint: true },
              include: { unit: { select: { abbreviation: true } }, category: { select: { name: true, nameAr: true } } },
            },
            branch: { select: { name: true, nameAr: true } },
          },
        });
        const lowStockItems = inventory.filter(i => i.quantity <= i.product.minStockLevel);
        let csv = UTF8_BOM + row(['SKU','ProductName','ProductNameAr','Category','Branch','BranchAr','CurrentQty','MinStockLevel','ReorderPoint','Unit','Shortage','CostPrice','ShortageValue']);
        for (const i of lowStockItems) {
          const shortage = Math.max(0, i.product.reorderPoint - i.quantity);
          const shortageValue = Math.round(shortage * (i.product.costPrice ?? 0) * 100) / 100;
          csv += row([i.product.sku, i.product.name, i.product.nameAr, (i.product as any).category?.name || '', i.branch.name, i.branch.nameAr, i.quantity, i.product.minStockLevel, i.product.reorderPoint, (i.product as any).unit?.abbreviation || '', shortage, i.product.costPrice, shortageValue]);
        }
        return csv;
      }

      case 'purchase-orders': {
        const data = await this.prisma.purchaseOrder.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            ...dateFilter,
            ...(status ? { status: status as any } : {}),
            ...(supplierId ? { supplierId } : {}),
            ...(search ? { poNumber: { contains: search, mode: 'insensitive' } } : {}),
          },
          include: {
            supplier: { select: { name: true, nameAr: true, phone: true, email: true } },
            branch: { select: { name: true, nameAr: true } },
            createdBy: { select: { firstName: true, lastName: true } },
            items: {
              include: {
                product: { select: { name: true, nameAr: true, sku: true } },
                unit: { select: { abbreviation: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
        let csv = UTF8_BOM + row(['PONumber','Supplier','SupplierAr','SupplierPhone','Branch','BranchAr','Status','Currency','POTotal','CreatedBy','CreatedAt','ExpectedDate','ReceivedDate','SKU','ProductName','ProductNameAr','OrderedQty','ReceivedQty','UnitPrice','Unit','LineTotal']);
        for (const po of data) {
          const createdBy = po.createdBy ? `${po.createdBy.firstName} ${po.createdBy.lastName}` : '';
          if (po.items.length === 0) {
            csv += row([po.poNumber, po.supplier.name, po.supplier.nameAr || '', po.supplier.phone || '', po.branch.name, po.branch.nameAr, po.status, po.currency, po.totalAmount, createdBy, po.createdAt.toISOString(), po.expectedDate?.toISOString() || '', po.receivedDate?.toISOString() || '', '', '', '', '', '', '', '', '']);
          } else {
            for (const item of po.items) {
              const lineTotal = Math.round(item.orderedQty * item.unitPrice * 100) / 100;
              csv += row([po.poNumber, po.supplier.name, po.supplier.nameAr || '', po.supplier.phone || '', po.branch.name, po.branch.nameAr, po.status, po.currency, po.totalAmount, createdBy, po.createdAt.toISOString(), po.expectedDate?.toISOString() || '', po.receivedDate?.toISOString() || '', item.product.sku, item.product.name, item.product.nameAr, item.orderedQty, item.receivedQty, item.unitPrice, item.unit?.abbreviation || '', lineTotal]);
            }
          }
        }
        return csv;
      }

      case 'wastage': {
        const data = await this.prisma.wastageRecord.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            ...dateFilter,
            ...(reason ? { reason: reason as any } : {}),
            ...(productId ? { productId } : {}),
            ...(hasProductWhere ? { product: productWhere } : {}),
          },
          include: {
            product: { select: { name: true, nameAr: true, sku: true, costPrice: true } },
            branch: { select: { name: true, nameAr: true } },
            unit: { select: { abbreviation: true } },
            loggedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        });
        let csv = UTF8_BOM + row(['SKU','ProductName','ProductNameAr','Branch','BranchAr','Quantity','Unit','UnitCost','TotalCost','Reason','Notes','LoggedBy','CreatedAt']);
        for (const w of data) {
          const totalCost = Math.round(w.quantity * (w.product.costPrice ?? 0) * 100) / 100;
          csv += row([w.product.sku, w.product.name, w.product.nameAr, w.branch.name, w.branch.nameAr, w.quantity, w.unit?.abbreviation || '', w.product.costPrice ?? 0, totalCost, w.reason, w.notes || '', w.loggedBy.firstName + ' ' + w.loggedBy.lastName, w.createdAt.toISOString()]);
        }
        return csv;
      }

      // ── NEW EXPORT TYPES (Odoo parity) ───────────────────────────────────

      case 'sessions': {
        const data = await this.prisma.posSession.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            ...(status ? { status: status as any } : {}),
            ...dateFilter,
          },
          include: {
            branch: { select: { name: true } },
            openedBy: { select: { firstName: true, lastName: true } },
            closedBy: { select: { firstName: true, lastName: true } },
          },
          orderBy: { openedAt: 'desc' },
          take: 5000,
        });
        let csv = UTF8_BOM + row(['SessionNo','Branch','Status','OpenedBy','OpenedAt','ClosedBy','ClosedAt','OpeningFloat','ClosingCounted','ExpectedCash','CashDifference','SalesTotal','OrderCount']);
        for (const s of data) {
          csv += row([s.sessionNo, s.branch?.name || '', s.status, s.openedBy ? `${s.openedBy.firstName} ${s.openedBy.lastName}` : '', s.openedAt.toISOString(), s.closedBy ? `${s.closedBy.firstName} ${s.closedBy.lastName}` : '', s.closedAt?.toISOString() || '', s.openingFloat, s.closingCounted, s.expectedCash, s.cashDifference, s.salesTotal, s.orderCount]);
        }
        return csv;
      }

      case 'transfers': {
        const data = await this.prisma.transferOrder.findMany({
          where: {
            ...(status ? { status: status as any } : {}),
            ...(branchId ? { OR: [{ fromBranchId: branchId }, { toBranchId: branchId }] } : {}),
            ...dateFilter,
          },
          include: {
            fromBranch: { select: { name: true } },
            toBranch: { select: { name: true } },
            items: { include: { product: { select: { name: true, sku: true } } } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        let csv = UTF8_BOM + row(['TransferNo','Status','FromBranch','ToBranch','DispatchedAt','ReceivedAt','SKU','Product','Quantity']);
        for (const t of data) {
          if (!t.items?.length) {
            csv += row([t.transferNo, t.status, t.fromBranch?.name || '', t.toBranch?.name || '', t.dispatchedAt?.toISOString() || '', t.receivedAt?.toISOString() || '', '', '', '']);
          } else {
            for (const item of t.items) {
              csv += row([t.transferNo, t.status, t.fromBranch?.name || '', t.toBranch?.name || '', t.dispatchedAt?.toISOString() || '', t.receivedAt?.toISOString() || '', item.product?.sku || '', item.product?.name || '', item.quantity]);
            }
          }
        }
        return csv;
      }

      case 'deliveries': {
        const data = await this.prisma.orderDelivery.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            ...(status ? { status: status as any } : {}),
          },
          include: {
            order: { select: { orderNo: true, total: true, tableName: true } },
            branch: { select: { name: true } },
            driver: { select: { firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        let csv = UTF8_BOM + row(['OrderNo','Branch','Status','Driver','Total','Address','Phone','CreatedAt','DeliveredAt']);
        for (const d of data) {
          csv += row([d.order?.orderNo || '', d.branch?.name || '', d.status, d.driver ? `${d.driver.firstName} ${d.driver.lastName}` : '', d.order?.total ?? '', d.address || '', d.phone || '', d.createdAt.toISOString(), d.deliveredAt?.toISOString() || '']);
        }
        return csv;
      }

      case 'receivables': {
        const data = await this.prisma.order.findMany({
          where: {
            status: 'COMPLETED' as any,
            ...(branchId ? { branchId } : {}),
            paidTotal: { lt: this.prisma.order.fields?.total as any },
          },
          include: {
            customer: { select: { name: true, phone: true } },
            branch: { select: { name: true } },
          },
          orderBy: { completedAt: 'desc' },
          take: 5000,
        });
        // Filter in-memory for paidTotal < total (Prisma doesn't support field-to-field comparisons easily)
        const filtered = data.filter((o: any) => o.paidTotal < o.total);
        let csv = UTF8_BOM + row(['OrderNo','Customer','Phone','Branch','Total','Paid','Outstanding','CompletedAt']);
        for (const o of filtered) {
          csv += row([o.orderNo, o.customer?.name || '', o.customer?.phone || '', o.branch?.name || '', o.total, o.paidTotal, Math.round((o.total - o.paidTotal) * 100) / 100, o.completedAt?.toISOString() || '']);
        }
        return csv;
      }

      case 'payables': {
        const data = await this.prisma.purchaseOrder.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            status: { in: ['FULLY_RECEIVED', 'PARTIALLY_RECEIVED'] as any[] },
          },
          include: {
            supplier: { select: { name: true, phone: true } },
            branch: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        let csv = UTF8_BOM + row(['PONumber','Supplier','Phone','Branch','TotalAmount','PaidAmount','Outstanding','CreatedAt','ReceivedDate']);
        for (const po of data) {
          const outstanding = Math.round(((po.totalAmount as number) - (po.paidAmount as number)) * 100) / 100;
          csv += row([po.poNumber, po.supplier?.name || '', po.supplier?.phone || '', po.branch?.name || '', po.totalAmount, po.paidAmount, outstanding, po.createdAt.toISOString(), po.receivedDate?.toISOString() || '']);
        }
        return csv;
      }

      case 'users': {
        const data = await this.prisma.user.findMany({
          include: {
            branch: { select: { name: true } },
            userBranches: { include: { branch: { select: { name: true } } } },
          },
          orderBy: { firstName: 'asc' },
        });
        let csv = UTF8_BOM + row(['ID','FirstName','LastName','FirstNameAr','LastNameAr','Email','Role','IsActive','PrimaryBranch','AssignedBranches','CreatedAt']);
        for (const u of data) {
          const assigned = u.userBranches.map((ub: any) => ub.branch?.name).filter(Boolean).join('; ');
          csv += row([u.id, u.firstName, u.lastName, u.firstNameAr || '', u.lastNameAr || '', u.email, u.role, u.isActive, u.branch?.name || '', assigned, u.createdAt.toISOString()]);
        }
        return csv;
      }

      case 'production': {
        const data = await this.prisma.productionOrder.findMany({
          where: {
            ...(branchId ? { branchId } : {}),
            ...(status ? { status: status as any } : {}),
            ...dateFilter,
          },
          include: {
            product: { select: { name: true, sku: true } },
            branch: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        let csv = UTF8_BOM + row(['ProductionNo','Product','SKU','Branch','Status','PlannedQty','ProducedQty','TotalCost','CreatedAt','CompletedAt']);
        for (const p of data) {
          csv += row([p.productionNo, p.product?.name || '', p.product?.sku || '', p.branch?.name || '', p.status, p.plannedQty, p.producedQty, p.totalCost, p.createdAt.toISOString(), p.completedAt?.toISOString() || '']);
        }
        return csv;
      }

      case 'loyalty': {
        const programs = await this.prisma.loyaltyProgram.findMany({ orderBy: { name: 'asc' } });
        const cards = await this.prisma.loyaltyCard.findMany({
          include: { program: { select: { name: true, type: true } } },
          orderBy: { createdAt: 'desc' },
          take: 5000,
        });
        let csv = UTF8_BOM + row(['CardCode','ProgramName','ProgramType','Points','Balance','CreatedAt']);
        for (const c of cards) {
          csv += row([c.code, c.program?.name || '', c.program?.type || '', c.points, c.balance, c.createdAt.toISOString()]);
        }
        return csv;
      }

      default:
        return UTF8_BOM;
    }
  }

  async exportData(type: string, branchId?: number) {
    switch (type) {
      case 'requisitions':
        return this.prisma.requisition.findMany({
          where: branchId ? { branchId } : undefined,
          include: { branch: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
          orderBy: { createdAt: 'desc' },
        });
      case 'inventory':
        return this.prisma.inventory.findMany({
          where: branchId ? { branchId } : undefined,
          include: { product: { select: { name: true, sku: true } }, branch: { select: { name: true } } },
        });
      case 'purchase-orders':
        return this.prisma.purchaseOrder.findMany({
          where: branchId ? { branchId } : undefined,
          include: { supplier: { select: { name: true } }, items: { include: { product: { select: { name: true, sku: true } } } } },
          orderBy: { createdAt: 'desc' },
        });
      case 'wastage':
        return this.prisma.wastageRecord.findMany({
          where: branchId ? { branchId } : undefined,
          include: { product: { select: { name: true, sku: true } }, branch: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        });
      default:
        return [];
    }
  }

  /** Get Purchase Order statistics */
  async getPurchaseOrderStats(branchId?: number) {
    const where = branchId ? { branchId } : {};
    const [total, draft, sent, partiallyReceived, fullyReceived, cancelled] = await Promise.all([
      this.prisma.purchaseOrder.count({ where }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'SENT_TO_SUPPLIER' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'PARTIALLY_RECEIVED' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'FULLY_RECEIVED' } }),
      this.prisma.purchaseOrder.count({ where: { ...where, status: 'CANCELLED' } }),
    ]);
    
    // Calculate total value of pending POs
    const pendingPOs = await this.prisma.purchaseOrder.findMany({
      where: { ...where, status: { in: ['DRAFT', 'SENT_TO_SUPPLIER', 'PARTIALLY_RECEIVED'] } },
      select: { totalAmount: true, currency: true },
    });
    const pendingValue = pendingPOs.reduce((sum, po) => sum + po.totalAmount, 0);
    
    return {
      total,
      draft,
      sent,
      partiallyReceived,
      fullyReceived,
      cancelled,
      pending: draft + sent + partiallyReceived,
      pendingValue: Math.round(pendingValue * 100) / 100,
    };
  }
}
