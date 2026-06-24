import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PricelistsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.pricelist.findMany({ where: { isActive: true }, include: { items: true }, orderBy: { id: 'asc' } });
  }
  create(dto: any) {
    const { items, ...rest } = dto || {};
    return this.prisma.pricelist.create({
      data: { ...rest, ...(Array.isArray(items) ? { items: { create: items } } : {}) },
      include: { items: true },
    });
  }
  update(id: number, dto: any) {
    const { items, ...rest } = dto || {};
    return this.prisma.pricelist.update({ where: { id }, data: rest, include: { items: true } });
  }
  remove(id: number) { return this.prisma.pricelist.update({ where: { id }, data: { isActive: false } }); }

  /** Resolve the effective price of a product under a pricelist (item override → base salePrice). */
  async priceFor(pricelistId: number, productId: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { salePrice: true, categoryId: true } });
    const base = product?.salePrice ?? 0;
    const items = await this.prisma.pricelistItem.findMany({ where: { pricelistId } });
    const item = items.find((i) => i.productId === productId) || items.find((i) => i.categoryId === product?.categoryId);
    if (!item) return { price: base, source: 'base' };
    if (item.fixedPrice != null) return { price: item.fixedPrice, source: 'fixed' };
    if (item.percentPrice != null) return { price: Math.round(base * (1 - item.percentPrice / 100) * 100) / 100, source: 'percent' };
    return { price: base, source: 'base' };
  }
}
