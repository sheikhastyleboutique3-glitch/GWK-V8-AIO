import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AlertType } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private prisma: PrismaService) {}

  findAll(branchId?: number, isRead?: boolean) {
    return this.prisma.alert.findMany({
      where: {
        ...(branchId && { branchId }),
        ...(isRead !== undefined && { isRead }),
        isResolved: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  markRead(id: number) {
    return this.prisma.alert.update({ where: { id }, data: { isRead: true } });
  }

  resolve(id: number) {
    return this.prisma.alert.update({ where: { id }, data: { isResolved: true } });
  }

  /**
   * Generate expiry warnings for inventory items expiring within 7 days.
   * Uses a single efficient query with LEFT JOIN exclusion to avoid N+1.
   */
  async generateExpiryAlerts() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + 7);

    // Find items near expiry that DON'T already have an unresolved alert.
    // Use raw SQL to do the anti-join in one query instead of N findFirst calls.
    const nearExpiry = await this.prisma.$queryRaw<
      Array<{
        productId: number;
        branchId: number;
        productName: string;
        productNameAr: string;
        branchName: string;
        expiryDate: Date;
      }>
    >`
      SELECT
        i."productId",
        i."branchId",
        p."name" AS "productName",
        p."nameAr" AS "productNameAr",
        b."name" AS "branchName",
        i."expiryDate"
      FROM inventory i
      JOIN products p ON p.id = i."productId"
      JOIN branches b ON b.id = i."branchId"
      LEFT JOIN alerts a ON
        a.type = 'EXPIRY_WARNING'
        AND a."productId" = i."productId"
        AND a."branchId" = i."branchId"
        AND a."isResolved" = false
      WHERE i."expiryDate" <= ${cutoff}
        AND i.quantity > 0
        AND a.id IS NULL
      LIMIT 200
    `;

    if (!nearExpiry.length) return { generated: 0 };

    const alertsData = nearExpiry.map((item) => {
      const daysLeft = Math.ceil(
        (new Date(item.expiryDate).getTime() - Date.now()) / 86400000,
      );
      return {
        type: AlertType.EXPIRY_WARNING,
        title: `Expiry Warning: ${item.productName}`,
        titleAr: `تحذير: ${item.productNameAr}`,
        message: `${item.productName} at ${item.branchName} expires in ${daysLeft} day(s)`,
        branchId: item.branchId,
        productId: item.productId,
      };
    });

    const result = await this.prisma.alert.createMany({ data: alertsData });
    this.logger.log(`Generated ${result.count} expiry alerts`);
    return { generated: result.count };
  }

  /**
   * Generate low-stock alerts for products below their minStockLevel.
   * Uses a single raw query with anti-join instead of fetching all inventory
   * rows and filtering in JS (was causing DB pressure on large deployments).
   */
  async generateLowStockAlerts() {
    // Single query: find products where total stock at a branch is at or below
    // minStockLevel, excluding those that already have an unresolved alert.
    const lowStock = await this.prisma.$queryRaw<
      Array<{
        productId: number;
        branchId: number;
        productName: string;
        productNameAr: string;
        branchName: string;
        totalQty: number;
        minStockLevel: number;
      }>
    >`
      SELECT
        sq."productId",
        sq."branchId",
        p."name" AS "productName",
        p."nameAr" AS "productNameAr",
        b."name" AS "branchName",
        sq."totalQty",
        p."minStockLevel"
      FROM (
        SELECT "productId", "branchId", SUM(quantity) AS "totalQty"
        FROM inventory
        GROUP BY "productId", "branchId"
      ) sq
      JOIN products p ON p.id = sq."productId"
      JOIN branches b ON b.id = sq."branchId"
      LEFT JOIN alerts a ON
        a.type = 'LOW_STOCK'
        AND a."productId" = sq."productId"
        AND a."branchId" = sq."branchId"
        AND a."isResolved" = false
      WHERE p."minStockLevel" > 0
        AND sq."totalQty" <= p."minStockLevel"
        AND p."isActive" = true
        AND a.id IS NULL
      LIMIT 200
    `;

    if (!lowStock.length) return { generated: 0 };

    const alertsData = lowStock.map((item) => ({
      type: AlertType.LOW_STOCK,
      title: `Low Stock: ${item.productName}`,
      titleAr: `مخزون منخفض: ${item.productNameAr}`,
      message: `${item.productName} at ${item.branchName}: ${Number(item.totalQty).toFixed(1)} remaining (min: ${item.minStockLevel})`,
      branchId: item.branchId,
      productId: item.productId,
    }));

    const result = await this.prisma.alert.createMany({ data: alertsData });
    this.logger.log(`Generated ${result.count} low-stock alerts`);
    return { generated: result.count };
  }
}
