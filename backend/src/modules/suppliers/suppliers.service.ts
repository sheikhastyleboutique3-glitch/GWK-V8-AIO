import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.supplier.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  async findOne(id: number) {
    const s = await this.prisma.supplier.findUnique({
      where: { id },
      include: { products: { where: { isActive: true } } },
    });
    if (!s) throw new NotFoundException('Supplier not found');
    return s;
  }

  create(dto: any) {
    return this.prisma.supplier.create({ data: dto });
  }

  update(id: number, dto: any) {
    return this.prisma.supplier.update({ where: { id }, data: dto });
  }

  remove(id: number) {
    return this.prisma.supplier.update({ where: { id }, data: { isActive: false } });
  }

  async getPriceHistory(supplierId: number, productId?: number) {
    const where: any = { supplierId };
    if (productId) where.productId = productId;
    return this.prisma.supplierPriceHistory.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, nameAr: true, sku: true } },
        changedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Supplier price comparison — for a given product (or set of products),
   * show the current cost price from each supplier that carries it, plus
   * the price trend (last 3 changes). Helps procurement choose the best vendor.
   */
  async priceComparison(productIds: number[]) {
    if (!productIds.length) return [];

    // Get all products with their current supplier + cost price
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: {
        id: true, name: true, nameAr: true, sku: true,
        costPrice: true, supplierId: true,
        supplier: { select: { id: true, name: true } },
      },
    });

    // Get price history for these products across ALL suppliers
    const history = await this.prisma.supplierPriceHistory.findMany({
      where: { productId: { in: productIds } },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    // Group by product → supplier → price points
    const result = products.map(p => {
      const productHistory = history.filter(h => h.productId === p.id);
      const supplierPrices = new Map<number, { supplier: any; currentPrice: number; history: any[] }>();

      // Current supplier
      if (p.supplierId && p.supplier) {
        supplierPrices.set(p.supplierId, {
          supplier: p.supplier,
          currentPrice: p.costPrice,
          history: productHistory.filter(h => h.supplierId === p.supplierId).slice(0, 3),
        });
      }

      // Other suppliers from history
      for (const h of productHistory) {
        if (!supplierPrices.has(h.supplierId)) {
          supplierPrices.set(h.supplierId, {
            supplier: h.supplier,
            currentPrice: h.newPrice,
            history: productHistory.filter(ph => ph.supplierId === h.supplierId).slice(0, 3),
          });
        }
      }

      const suppliers = Array.from(supplierPrices.values()).sort((a, b) => a.currentPrice - b.currentPrice);
      const cheapest = suppliers[0];
      const savings = suppliers.length > 1 ? suppliers[suppliers.length - 1].currentPrice - cheapest.currentPrice : 0;

      return {
        product: { id: p.id, name: p.name, nameAr: p.nameAr, sku: p.sku },
        currentSupplier: p.supplier,
        currentPrice: p.costPrice,
        suppliers,
        cheapestSupplier: cheapest?.supplier,
        cheapestPrice: cheapest?.currentPrice ?? p.costPrice,
        potentialSavings: Math.round(savings * 100) / 100,
      };
    });

    return result.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }
}
