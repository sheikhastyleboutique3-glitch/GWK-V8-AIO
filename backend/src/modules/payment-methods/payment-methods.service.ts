import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private prisma: PrismaService) {}
  findAll(activeOnly = false) {
    return this.prisma.paymentMethodConfig.findMany({ where: activeOnly ? { isActive: true } : {}, orderBy: { sortOrder: 'asc' } });
  }
  create(dto: any) { return this.prisma.paymentMethodConfig.create({ data: dto }); }
  update(id: number, dto: any) { return this.prisma.paymentMethodConfig.update({ where: { id }, data: dto }); }
  remove(id: number) { return this.prisma.paymentMethodConfig.update({ where: { id }, data: { isActive: false } }); }
}
