import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { WastageReason, InventoryTxType, FinanceEntryType } from '@prisma/client';
import { InventoryService } from '../inventory/inventory.service';
import { FinanceService } from '../finance/finance.service';

@Injectable()
export class WastageService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private audit: AuditService,
    private finance: FinanceService,
  ) {}

  findAll(branchId?: number, filters?: { search?: string; reason?: string; productId?: number; from?: string; to?: string }) {
    const where: any = { ...(branchId && { branchId }) };
    if (filters?.reason) where.reason = filters.reason;
    if (filters?.productId) where.productId = filters.productId;
    if (filters?.from || filters?.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to) } : {}),
      };
    }
    if (filters?.search) {
      where.product = {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { nameAr: { contains: filters.search, mode: 'insensitive' } },
          { sku: { contains: filters.search, mode: 'insensitive' } },
        ],
      };
    }
    return this.prisma.wastageRecord.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, nameAr: true, sku: true } },
        branch: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true, abbreviation: true } },
        loggedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(
    dto: { branchId: number; productId: number; unitId?: number; quantity: number; reason: WastageReason; notes?: string },
    userId: number,
  ) {
    await this.inventoryService.adjust({
      productId: dto.productId,
      branchId: dto.branchId,
      quantity: dto.quantity,
      type: InventoryTxType.WASTAGE,
      notes: `Wastage: ${dto.reason}. ${dto.notes || ''}`,
      performedById: userId,
    });
    const record = await this.prisma.wastageRecord.create({
      data: { ...dto, loggedById: userId },
      include: {
        product: true,
        branch: true,
        loggedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    this.audit.create({
      userId,
      action: 'CREATE',
      entity: 'wastage',
      entityId: String(record.id),
      newValues: { productId: dto.productId, quantity: dto.quantity, reason: dto.reason },
    }).catch(() => {});

    // Post wastage cost to finance journal (cost = qty × product costPrice)
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId }, select: { costPrice: true, name: true } });
    const wastageCost = dto.quantity * (product?.costPrice ?? 0);
    if (wastageCost > 0) {
      this.finance.create({
        type: FinanceEntryType.WASTAGE,
        amount: -wastageCost,
        branchId: dto.branchId,
        sourceType: 'wastage',
        sourceId: record.id,
        reference: `${product?.name ?? ''} x${dto.quantity}`,
        notes: `Wastage: ${dto.reason}. ${dto.notes || ''}`,
        createdById: userId,
      }).catch(() => {});
    }

    return record;
  }

  getStats(branchId?: number) {
    return this.prisma.wastageRecord.groupBy({
      by: ['reason'],
      where: { ...(branchId && { branchId }) },
      _sum: { quantity: true },
      _count: true,
    });
  }
}
