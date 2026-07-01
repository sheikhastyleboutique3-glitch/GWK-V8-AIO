import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { EodEmailService } from './eod-email.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { BranchIsolationGuard } from '../../common/guards/branch-isolation.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, BranchIsolationGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private svc: AnalyticsService, private eod: EodEmailService) {}

  /**
   * Consolidated dashboard endpoint — returns ALL data needed for DashboardPage
   * in a single request instead of 8 parallel calls. Reduces dashboard load
   * from ~800ms to <200ms.
   */
  @Get('dashboard-summary')
  async dashboardSummary(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
  ) {
    const bid = branchId ? parseInt(branchId, 10) : undefined;
    const p = period || 'today';
    const [sales, bestSellers, topCustomers, alerts, pendingReqs] = await Promise.all([
      this.svc.salesSummary({ branchId: bid, period: p }),
      this.svc.bestSellers({ branchId: bid, period: p, limit: 5 }),
      this.svc.topCustomers({ branchId: bid, period: p, limit: 5 }),
      this.svc.dashboardAlerts(bid),
      this.svc.pendingRequisitionsCount(bid),
    ]);
    return { sales, bestSellers, topCustomers, alerts, pendingReqs };
  }

  @Get('sales-summary')
  salesSummary(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.salesSummary({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      period,
      from,
      to,
    });
  }

  @Get('best-sellers')
  bestSellers(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.bestSellers({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      period,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('top-customers')
  topCustomers(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.topCustomers({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      period,
      from,
      to,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('product-sales')
  productSalesReport(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.productSalesReport({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      period,
      from,
      to,
    });
  }

  @Get('staff-performance')
  staffPerformance(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.staffPerformance({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      period,
      from,
      to,
    });
  }

  @Get('tip-report')
  tipReport(
    @Query('branchId') branchId?: string,
    @Query('period') period?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.tipReport({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      period,
      from,
      to,
    });
  }

  @Get('cash-reconciliation')
  cashReconciliation(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.cashReconciliation({
      branchId: branchId ? parseInt(branchId, 10) : undefined,
      from,
      to,
    });
  }

  /** Manually trigger the end-of-day email (manager+). */
  @Post('send-eod-email')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  sendEodEmail(@Query('date') date?: string) {
    return this.eod.sendEodEmail(date);
  }

  // ── Advanced Analytics ────────────────────────────────────────────────────

  @Get('abc-analysis')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER, Role.PROCUREMENT)
  abcAnalysis(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.abcAnalysis({
      branchId: branchId ? +branchId : undefined,
      from, to,
    });
  }

  @Get('waste-ratio')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  wasteVsSalesRatio(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.wasteVsSalesRatio({
      branchId: branchId ? +branchId : undefined,
      from, to,
    });
  }

  @Get('peak-hours')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  peakHourHeatmap(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.svc.peakHourHeatmap({
      branchId: branchId ? +branchId : undefined,
      from, to,
    });
  }

  @Get('customer-clv')
  @Roles(Role.SUPER_ADMIN, Role.BRANCH_MANAGER)
  customerLifetimeValue(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.customerLifetimeValue({
      branchId: branchId ? +branchId : undefined,
      from, to,
      limit: limit ? +limit : undefined,
    });
  }
}
