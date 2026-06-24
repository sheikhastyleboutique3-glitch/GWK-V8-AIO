import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProductAttributesService } from './product-attributes.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Product Attributes & Variants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('product-attributes')
export class ProductAttributesController {
  constructor(private svc: ProductAttributesService) {}

  @Get() findAll() { return this.svc.findAll(); }

  @Post() @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: any) { return this.svc.create(dto); }

  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: any) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }

  @Get('variants/:productId')
  variants(@Param('productId', ParseIntPipe) productId: number) { return this.svc.variants(productId); }

  @Post('variants') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  createVariant(@Body() dto: any) { return this.svc.createVariant(dto); }

  @Delete('variants/:id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  removeVariant(@Param('id', ParseIntPipe) id: number) { return this.svc.removeVariant(id); }
}
