import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryTxType, FinanceEntryType } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class StockCountsService {
  constructor(
    private prisma: PrismaService,
    private inventory: InventoryService,
    private finance: FinanceService,
  ) {}

  private async genNo(branchId: number) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.prisma.stockCount.count();
    return `SC-${stamp}-B${branchId}-${String(count + 1).padStart(4, '0')}`;
  }

  list(branchId?: number) {
    return this.prisma.stockCount.findMany({
      where: branchId ? { branchId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /** Attach product name/sku to a count's items for display. */
  private async hydrate(count: any) {
    const ids = count.items.map((i: any) => i.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, nameAr: true, sku: true, unit: { select: { abbreviation: true } } },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    return { ...count, items: count.items.map((i: any) => ({ ...i, product: byId.get(i.productId) ?? null })) };
  }

  async get(id: number) {
    const count = await this.prisma.stockCount.findUnique({ where: { id }, include: { items: { orderBy: { id: 'asc' } } } });
    if (!count) throw new NotFoundException(`Stock count ${id} not found`);
    return this.hydrate(count);
  }

  /** Open a new count: snapshot current on-hand per product at the branch. */
  async create(branchId: number, userId?: number) {
    const rows = await this.prisma.inventory.findMany({
      where: { branchId },
      include: { product: { select: { id: true, costPrice: true } } },
    });
    // Collapse to one line per product (sum batch rows).
    const byProduct = new Map<number, { systemQty: number; unitCost: number }>();
    for (const r of rows) {
      const g = byProduct.get(r.productId) ?? { systemQty: 0, unitCost: r.product?.costPrice ?? 0 };
      g.systemQty += r.quantity;
      byProduct.set(r.productId, g);
    }
    if (!byProduct.size) throw new BadRequestException('No inventory at this branch to count.');

    const created = await this.prisma.stockCount.create({
      data: {
        countNo: await this.genNo(branchId),
        branchId,
        createdById: userId ?? null,
        items: {
          create: [...byProduct.entries()].map(([productId, g]) => ({
            productId,
            systemQty: g.systemQty,
            countedQty: g.systemQty,
            variance: 0,
            unitCost: g.unitCost,
            varianceValue: 0,
          })),
        },
      },
      include: { items: { orderBy: { id: 'asc' } } },
    });
    return this.hydrate(created);
  }

  /** Save counted quantities and recompute variances + total shrinkage value. */
  async updateCounts(id: number, items: { id: number; countedQty: number }[]) {
    const count = await this.prisma.stockCount.findUnique({ where: { id }, include: { items: true } });
    if (!count) throw new NotFoundException(`Stock count ${id} not found`);
    if (count.status !== 'DRAFT') throw new BadRequestException('Only DRAFT counts can be edited.');

    const patch = new Map(items.map((i) => [i.id, i.countedQty]));
    let totalVarianceValue = 0;
    await this.prisma.$transaction(
      count.items.map((it) => {
        const counted = patch.has(it.id) ? Number(patch.get(it.id)) : it.countedQty;
        const variance = +(counted - it.systemQty).toFixed(4);
        const varianceValue = +(variance * it.unitCost).toFixed(2);
        totalVarianceValue += varianceValue;
        return this.prisma.stockCountItem.update({
          where: { id: it.id },
          data: { countedQty: counted, variance, varianceValue },
        });
      }),
    );
    await this.prisma.stockCount.update({ where: { id }, data: { totalVarianceValue: +totalVarianceValue.toFixed(2) } });
    return this.get(id);
  }

  async finalize(id: number, userId?: number) {
    const count = await this.prisma.stockCount.findUnique({ where: { id }, include: { items: true } });
    if (!count) throw new NotFoundException(`Stock count ${id} not found`);
    if (count.status !== 'DRAFT') throw new BadRequestException('Count is already finalized.');

    // Reconcile system stock to the physically counted quantities — this is the
    // whole point of a count. Done atomically: every item's variance adjustment
    // + the status change commit together, so a failure on any item rolls the
    // entire finalize back (stock is never left partially reconciled).
    //   - shrinkage (counted < system): FEFO deduct the difference (WASTAGE)
    //   - surplus   (counted > system): add the difference (RETURN_IN)
    // The net variance cost is also posted to the finance journal (WASTAGE type,
    // signed) so COGS/inventory valuation stays accurate.
    await this.prisma.$transaction(
      async (tx) => {
        let netCostImpact = 0; // signed: shrinkage negative (cost), surplus positive
        for (const item of count.items) {
          const variance = +(item.countedQty - item.systemQty).toFixed(4);
          if (!variance) continue;
          netCostImpact += variance * item.unitCost;
          await this.inventory.applyManualAdjustment(
            tx,
            {
              productId: item.productId,
              branchId: count.branchId,
              quantity: Math.abs(variance),
              type: variance < 0 ? InventoryTxType.WASTAGE : InventoryTxType.RETURN_IN,
              notes: `Stock count ${count.countNo} reconciliation (${variance > 0 ? '+' : ''}${variance})`,
              performedById: userId ?? count.createdById ?? undefined,
            },
            { allowNegative: true },
          );
        }
        // Post the net variance to the finance journal for accurate COGS.
        // amount is signed (cost negative, gain positive) — matches varianceValue.
        const amount = +netCostImpact.toFixed(2);
        if (Math.abs(amount) >= 0.01) {
          await this.finance.create(
            {
              type: FinanceEntryType.WASTAGE,
              amount,
              branchId: count.branchId,
              sourceType: 'stock_count',
              sourceId: count.id,
              reference: count.countNo,
              notes: `Stock count ${count.countNo} variance`,
              createdById: userId ?? count.createdById ?? undefined,
            },
            tx,
          );
        }
        await tx.stockCount.update({ where: { id }, data: { status: 'FINALIZED', finalizedAt: new Date() } });
      },
      { isolationLevel: 'Serializable', maxWait: 10_000, timeout: 30_000 },
    );
    return this.get(id);
  }
}
