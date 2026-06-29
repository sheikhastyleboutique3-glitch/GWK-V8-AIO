import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IotDevicesService } from './iot-devices.service';
import { CreateIotDeviceDto, UpdateIotDeviceDto } from './iot-devices.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('IoT Devices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('iot-devices')
export class IotDevicesController {
  constructor(private svc: IotDevicesService) {}

  @Get() findAll(@Query('branchId') branchId?: string) { return this.svc.findAll(branchId ? parseInt(branchId, 10) : undefined); }

  @Post() @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  create(@Body() dto: CreateIotDeviceDto) { return this.svc.create(dto); }

  @Patch(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateIotDeviceDto) { return this.svc.update(id, dto); }

  @Delete(':id') @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  remove(@Param('id', ParseIntPipe) id: number) { return this.svc.remove(id); }
}
