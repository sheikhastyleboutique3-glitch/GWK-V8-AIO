import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentTerminalsService {
  constructor(private prisma: PrismaService) {}
  findAll() { return this.prisma.paymentTerminal.findMany({ orderBy: { name: 'asc' } }); }
  create(dto: any) { return this.prisma.paymentTerminal.create({ data: dto }); }
  update(id: number, dto: any) { return this.prisma.paymentTerminal.update({ where: { id }, data: dto }); }
  remove(id: number) { return this.prisma.paymentTerminal.update({ where: { id }, data: { isActive: false } }); }
}
