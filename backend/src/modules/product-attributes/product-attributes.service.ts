import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProductAttributesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.productAttribute.findMany({ where: { isActive: true }, include: { values: { orderBy: { sortOrder: 'asc' } } }, orderBy: { id: 'asc' } });
  }
  create(dto: any) {
    const { values, ...rest } = dto || {};
    return this.prisma.productAttribute.create({
      data: { ...rest, ...(Array.isArray(values) ? { values: { create: values } } : {}) },
      include: { values: true },
    });
  }
  update(id: number, dto: any) {
    const { values, ...rest } = dto || {};
    return this.prisma.productAttribute.update({ where: { id }, data: rest, include: { values: true } });
  }
  remove(id: number) { return this.prisma.productAttribute.update({ where: { id }, data: { isActive: false } }); }

  // ---- Variants ----
  variants(productId: number) {
    return this.prisma.productVariant.findMany({ where: { productId }, orderBy: { id: 'asc' } });
  }
  createVariant(dto: any) { return this.prisma.productVariant.create({ data: dto }); }
  removeVariant(id: number) { return this.prisma.productVariant.update({ where: { id }, data: { isActive: false } }); }
}
