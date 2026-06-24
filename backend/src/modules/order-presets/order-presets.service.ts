import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class OrderPresetsService {
  constructor(private prisma: PrismaService) {}
  findAll(activeOnly = false) {
    return this.prisma.orderPreset.findMany({ where: activeOnly ? { isActive: true } : {}, orderBy: { sortOrder: 'asc' } });
  }
  create(dto: any) { return this.prisma.orderPreset.create({ data: dto }); }
  update(id: number, dto: any) { return this.prisma.orderPreset.update({ where: { id }, data: dto }); }
  remove(id: number) { return this.prisma.orderPreset.update({ where: { id }, data: { isActive: false } }); }
}
