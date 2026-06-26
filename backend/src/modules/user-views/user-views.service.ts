import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UserViewsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number, pageId?: string) {
    return this.prisma.userView.findMany({
      where: { userId, ...(pageId ? { pageId } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: number, dto: { pageId: string; name: string; filters?: any; groupBy?: any; columns?: any; isDefault?: boolean }) {
    // If setting as default, unset all other defaults for this page
    if (dto.isDefault) {
      await this.prisma.userView.updateMany({
        where: { userId, pageId: dto.pageId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.userView.create({
      data: {
        userId,
        pageId: dto.pageId,
        name: dto.name,
        filters: dto.filters ?? {},
        groupBy: dto.groupBy ?? [],
        columns: dto.columns ?? null,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(userId: number, id: number, dto: { name?: string; filters?: any; groupBy?: any; columns?: any; isDefault?: boolean }) {
    const view = await this.prisma.userView.findFirst({ where: { id, userId } });
    if (!view) throw new NotFoundException('View not found');
    if (dto.isDefault) {
      await this.prisma.userView.updateMany({
        where: { userId, pageId: view.pageId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.userView.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: number, id: number) {
    const view = await this.prisma.userView.findFirst({ where: { id, userId } });
    if (!view) throw new NotFoundException('View not found');
    await this.prisma.userView.delete({ where: { id } });
    return { message: 'View deleted' };
  }

  async getDefault(userId: number, pageId: string) {
    return this.prisma.userView.findFirst({ where: { userId, pageId, isDefault: true } });
  }
}
