import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserViewsService } from './user-views.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('User Views')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('user-views')
export class UserViewsController {
  constructor(private svc: UserViewsService) {}

  @Get()
  findAll(@CurrentUser('sub') userId: number, @Query('pageId') pageId?: string) {
    return this.svc.findAll(userId, pageId);
  }

  @Get('default/:pageId')
  getDefault(@CurrentUser('sub') userId: number, @Param('pageId') pageId: string) {
    return this.svc.getDefault(userId, pageId);
  }

  @Post()
  create(@CurrentUser('sub') userId: number, @Body() dto: any) {
    return this.svc.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('sub') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
  ) {
    return this.svc.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('sub') userId: number, @Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(userId, id);
  }
}
