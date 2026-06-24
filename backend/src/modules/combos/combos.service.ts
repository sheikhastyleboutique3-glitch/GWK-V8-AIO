import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CombosService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.combo.findMany({
      where: { isActive: true },
      include: { lines: { include: { choices: true } } },
      orderBy: { id: 'asc' },
    });
  }

  create(dto: any) {
    const { lines, ...rest } = dto || {};
    return this.prisma.combo.create({
      data: {
        ...rest,
        ...(Array.isArray(lines)
          ? {
              lines: {
                create: lines.map((l: any) => ({
                  name: l.name,
                  minSelect: l.minSelect ?? 1,
                  maxSelect: l.maxSelect ?? 1,
                  ...(Array.isArray(l.choices)
                    ? { choices: { create: l.choices.map((c: any) => ({ productId: c.productId, priceExtra: c.priceExtra ?? 0 })) } }
                    : {}),
                })),
              },
            }
          : {}),
      },
      include: { lines: { include: { choices: true } } },
    });
  }

  update(id: number, dto: any) {
    const { lines, ...rest } = dto || {};
    return this.prisma.combo.update({ where: { id }, data: rest, include: { lines: { include: { choices: true } } } });
  }

  remove(id: number) {
    return this.prisma.combo.update({ where: { id }, data: { isActive: false } });
  }
}
