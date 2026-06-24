import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class IotDevicesService {
  constructor(private prisma: PrismaService) {}
  findAll(branchId?: number) {
    return this.prisma.iotDevice.findMany({ where: { ...(branchId ? { branchId } : {}) }, orderBy: { name: 'asc' } });
  }
  create(dto: any) { return this.prisma.iotDevice.create({ data: dto }); }
  update(id: number, dto: any) { return this.prisma.iotDevice.update({ where: { id }, data: dto }); }
  remove(id: number) { return this.prisma.iotDevice.update({ where: { id }, data: { isActive: false } }); }
}
