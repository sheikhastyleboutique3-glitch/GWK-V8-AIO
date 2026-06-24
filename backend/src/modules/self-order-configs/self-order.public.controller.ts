import { Controller, Get, Post, Body, Param, ParseIntPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SalesService } from '../sales/sales.service';
import { Public } from '../../common/decorators/public.decorator';

/**
 * PUBLIC self-ordering (kiosk / QR / customer mobile). No auth: a guest scans a
 * QR or uses a kiosk, browses the branch menu, and places an order that lands
 * as an OPEN, isSelfOrder ticket for staff to confirm & fulfil.
 */
@ApiTags('Self-Order (public)')
@Controller('self-order')
export class SelfOrderPublicController {
  constructor(private prisma: PrismaService, private sales: SalesService) {}

  @Public()
  @Get(':configId/menu')
  async menu(@Param('configId', ParseIntPipe) configId: number) {
    const config = await this.prisma.selfOrderConfig.findUnique({ where: { id: configId } });
    if (!config || !config.isActive) throw new NotFoundException('Self-order point not found');
    const [categories, products] = await Promise.all([
      this.prisma.category.findMany({ where: { isActive: true, isPosVisible: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.product.findMany({
        where: { isActive: true, isArchived: false, isSellable: true, isAvailable: true, productType: 'MENU' },
        select: { id: true, name: true, nameAr: true, salePrice: true, costPrice: true, categoryId: true, imageUrl: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return { config: { id: config.id, name: config.name, mode: config.mode, branchId: config.branchId, requireTable: config.requireTable }, categories, products };
  }

  @Public()
  @Post(':configId/order')
  async placeOrder(
    @Param('configId', ParseIntPipe) configId: number,
    @Body() body: { tableName?: string; items: { productId: number; quantity: number; unitPrice: number }[]; notes?: string },
  ) {
    const config = await this.prisma.selfOrderConfig.findUnique({ where: { id: configId } });
    if (!config || !config.isActive) throw new NotFoundException('Self-order point not found');
    if (!body?.items?.length) throw new BadRequestException('Cart is empty');
    if (config.requireTable && !body.tableName) throw new BadRequestException('Table is required');
    return this.sales.create(
      {
        branchId: config.branchId,
        tableName: body.tableName,
        notes: body.notes,
        isSelfOrder: true,
        selfOrderMode: config.mode,
        items: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      },
      undefined,
    );
  }
}
