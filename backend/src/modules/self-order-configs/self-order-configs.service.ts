import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class SelfOrderConfigsService {
  constructor(private prisma: PrismaService) {}
  findAll(branchId?: number) {
    return this.prisma.selfOrderConfig.findMany({ where: { ...(branchId ? { branchId } : {}) }, orderBy: { name: 'asc' } });
  }
  create(dto: any) { return this.prisma.selfOrderConfig.create({ data: dto }); }
  update(id: number, dto: any) { return this.prisma.selfOrderConfig.update({ where: { id }, data: dto }); }
  remove(id: number) { return this.prisma.selfOrderConfig.update({ where: { id }, data: { isActive: false } }); }
}
