import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PosConfigsService {
  constructor(private prisma: PrismaService) {}

  findAll(branchId?: number) {
    return this.prisma.posConfig.findMany({
      where: { ...(branchId ? { branchId } : {}), isActive: true },
      include: { branch: { select: { id: true, name: true, nameAr: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const c = await this.prisma.posConfig.findUnique({
      where: { id },
      include: { branch: { select: { id: true, name: true, nameAr: true } } },
    });
    if (!c) throw new NotFoundException(`POS Config ${id} not found`);
    return c;
  }

  create(dto: any) {
    return this.prisma.posConfig.create({ data: dto });
  }

  async update(id: number, dto: any) {
    await this.findOne(id);
    return this.prisma.posConfig.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.posConfig.update({ where: { id }, data: { isActive: false } });
  }
}
