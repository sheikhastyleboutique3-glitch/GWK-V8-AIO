import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class FiscalPositionsService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.fiscalPosition.findMany({ where: { isActive: true }, include: { taxMaps: true }, orderBy: { name: 'asc' } }); }
  create(dto: any) {
    const { taxMaps, ...rest } = dto || {};
    return this.prisma.fiscalPosition.create({ data: { ...rest, ...(Array.isArray(taxMaps) ? { taxMaps: { create: taxMaps } } : {}) }, include: { taxMaps: true } });
  }
  update(id: number, dto: any) {
    const { taxMaps, ...rest } = dto || {};
    return this.prisma.fiscalPosition.update({ where: { id }, data: rest, include: { taxMaps: true } });
  }
  remove(id: number) { return this.prisma.fiscalPosition.update({ where: { id }, data: { isActive: false } }); }
}
