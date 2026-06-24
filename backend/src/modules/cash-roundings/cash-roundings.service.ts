import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CashRoundingsService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.cashRounding.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }); }
  create(dto: any) { return this.prisma.cashRounding.create({ data: dto }); }
  update(id: number, dto: any) { return this.prisma.cashRounding.update({ where: { id }, data: dto }); }
  remove(id: number) { return this.prisma.cashRounding.update({ where: { id }, data: { isActive: false } }); }
}
