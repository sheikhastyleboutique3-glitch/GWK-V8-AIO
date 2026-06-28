import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'List audit entries with filters' })
  findAll(
    @Query('entity') entity?: string,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('entityId') entityId?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.findAll({
      entity, action, entityId,
      userId: userId ? +userId : undefined,
      search, from, to,
      limit: limit ? +limit : undefined,
    });
  }

  @Get('record/:entity/:entityId')
  @ApiOperation({ summary: 'Get all audit entries for a specific record' })
  findByRecord(@Param('entity') entity: string, @Param('entityId') entityId: string) {
    return this.svc.findByRecord(entity, entityId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get activity timeline for a specific user' })
  findByUser(@Param('userId', ParseIntPipe) userId: number, @Query('limit') limit?: string) {
    return this.svc.findByUser(userId, limit ? +limit : 50);
  }

  @Get('entity-types')
  @ApiOperation({ summary: 'Get all unique entity types (for filter dropdown)' })
  getEntityTypes() {
    return this.svc.getEntityTypes();
  }

  @Get('action-types')
  @ApiOperation({ summary: 'Get all unique action types (for filter dropdown)' })
  getActionTypes() {
    return this.svc.getActionTypes();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Audit summary counts by entity, action, and user' })
  getSummary(@Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.getSummary(from, to);
  }
}
