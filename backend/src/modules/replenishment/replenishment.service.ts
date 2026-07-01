import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryTxType } from '@prisma/client';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';

export interface Suggestion {
  productId: number;
  sku: string;
  name: string;
  branchId: number;
  onHand: number;
  minStockLevel: number;
  reorderPoint: number;
  dailyUsage: number;
  suggestedQty: number;
  reason: string;
}

@Injectable()
export class ReplenishmentService {
  constructor(
    private prisma: PrismaService,
    private po: PurchaseOrdersService,
  ) {}

  /**
   * Auto-reorder suggestions: products at a branch whose on-hand has fallen to or
   * below their reorder point (or min stock). Suggested quantity tops stock back up
   * to cover `coverDays` of recent sales velocity, with the reorder point as a floor.
   */
  async suggestions(branchId: number, coverDays = 7, lookbackDays = 14): Promise<Suggestion[]> {
    // On-hand per product at the branch (sum across batches).
    const stock = await this.prisma.inventory.groupBy({
      by: ['productId'],
      where: { branchId },
      _sum: { quantity: true },
    });
    const onHand = new Map(stock.map((s) => [s.productId, s._sum.quantity ?? 0]));

    const products = await this.prisma.product.findMany({
      where: { isActive: true, isArchived: false },
      select: { id: true, sku: true, name: true, minStockLevel: true, reorderPoint: true },
    });

    // Recent consumption (SALE + PRODUCTION_CONSUME) over the lookback window.
    const since = new Date(Date.now() - lookbackDays * 864e5);
    const usage = await this.prisma.inventoryTransaction.groupBy({
      by: ['productId'],
      where: {
        branchId,
        type: { in: [InventoryTxType.SALE, InventoryTxType.PRODUCTION_CONSUME, InventoryTxType.WASTAGE] },
        createdAt: { gte: since },
      },
      _sum: { quantity: true },
    });
    const usageMap = new Map(usage.map((u) => [u.productId, u._sum.quantity ?? 0]));

    const out: Suggestion[] = [];
    for (const p of products) {
      const have = onHand.get(p.id) ?? 0;
      const threshold = p.reorderPoint || p.minStockLevel || 0;
      if (threshold <= 0 && have > 0) continue; // no policy & has stock -> skip
      if (have > threshold) continue; // above reorder point -> ok

      const dailyUsage = (usageMap.get(p.id) ?? 0) / lookbackDays;
      const target = Math.max(threshold, Math.ceil(dailyUsage * coverDays));
      const suggestedQty = Math.max(0, target - have);
      if (suggestedQty <= 0) continue;

      out.push({
        productId: p.id,
        sku: p.sku,
        name: p.name,
        branchId,
        onHand: have,
        minStockLevel: p.minStockLevel,
        reorderPoint: p.reorderPoint,
        dailyUsage: Math.round(dailyUsage * 100) / 100,
        suggestedQty: Math.round(suggestedQty * 100) / 100,
        reason: have <= 0 ? 'OUT_OF_STOCK' : 'BELOW_REORDER_POINT',
      });
    }
    return out.sort((a, b) => b.suggestedQty - a.suggestedQty);
  }

  /**
   * Turn replenishment suggestions into DRAFT purchase orders — one PO per
   * supplier, priced at each product's costPrice. Products with no supplier are
   * skipped and reported back. Reuses the proven PurchaseOrdersService.create so
   * PO numbering, totals and status handling stay consistent.
   */
  async generateDraftPurchaseOrders(branchId: number, userId: number, coverDays = 7, lookbackDays = 14) {
    const suggestions = await this.suggestions(branchId, coverDays, lookbackDays);
    if (!suggestions.length) {
      return { created: 0, skipped: [], purchaseOrders: [], message: 'Nothing to reorder — all stock is above its reorder point.' };
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: suggestions.map((s) => s.productId) } },
      select: { id: true, name: true, supplierId: true, costPrice: true, unitId: true },
    });
    const meta = new Map(products.map((p) => [p.id, p]));

    // Group suggested items by supplier; skip products without a supplier.
    const bySupplier = new Map<number, { productId: number; unitId?: number; orderedQty: number; unitPrice: number }[]>();
    const skipped: string[] = [];
    for (const s of suggestions) {
      const m = meta.get(s.productId);
      if (!m?.supplierId) { skipped.push(s.name); continue; }
      const arr = bySupplier.get(m.supplierId) ?? [];
      arr.push({ productId: s.productId, unitId: m.unitId ?? undefined, orderedQty: s.suggestedQty, unitPrice: m.costPrice ?? 0 });
      bySupplier.set(m.supplierId, arr);
    }

    const today = new Date().toISOString().slice(0, 10);
    const purchaseOrders = [];
    for (const [supplierId, items] of bySupplier) {
      const po = await this.po.create(
        { supplierId, branchId, notes: `Auto-generated from replenishment suggestions (${today})`, items },
        userId,
      );
      purchaseOrders.push(po);
    }

    return {
      created: purchaseOrders.length,
      skipped,
      purchaseOrders,
      message: purchaseOrders.length
        ? `Created ${purchaseOrders.length} draft PO(s)${skipped.length ? `; ${skipped.length} item(s) skipped (no supplier)` : ''}.`
        : 'No POs created — suggested products have no supplier assigned.',
    };
  }
}
