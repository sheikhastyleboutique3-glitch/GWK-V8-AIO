import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Public } from '../../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  /** Basic health check (used by Docker healthcheck + load balancer) */
  @Public()
  @Get()
  async check() {
    const start = Date.now();
    let dbOk = false;
    let dbLatency = 0;
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      dbLatency = Date.now() - dbStart;
      dbOk = true;
    } catch {}

    const mem = process.memoryUsage();
    const status = dbOk ? 'ok' : 'degraded';

    return {
      status,
      version: '8.1.0',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      db: {
        status: dbOk ? 'connected' : 'unreachable',
        latency: `${dbLatency}ms`,
      },
      responseTime: `${Date.now() - start}ms`,
      memory: {
        rss: `${Math.round(mem.rss / 1024 / 1024)}MB`,
        heap: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`,
        heapMax: `${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      },
      node: process.version,
      env: process.env.NODE_ENV || 'development',
    };
  }

  /** Deep health check — verifies all critical subsystems (admin use) */
  @Public()
  @Get('deep')
  async deepCheck() {
    const results: Record<string, { status: string; latency?: string; error?: string }> = {};
    const start = Date.now();

    // 1. Database connectivity
    try {
      const s = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      results.database = { status: 'ok', latency: `${Date.now() - s}ms` };
    } catch (e: any) {
      results.database = { status: 'error', error: e.message?.slice(0, 100) };
    }

    // 2. Database write capability
    try {
      const s = Date.now();
      await this.prisma.$executeRaw`SELECT pg_advisory_lock(12345)`;
      await this.prisma.$executeRaw`SELECT pg_advisory_unlock(12345)`;
      results.dbWrite = { status: 'ok', latency: `${Date.now() - s}ms` };
    } catch (e: any) {
      results.dbWrite = { status: 'error', error: e.message?.slice(0, 100) };
    }

    // 3. Critical table counts (ensures schema is intact)
    try {
      const s = Date.now();
      const [users, branches, products, orders] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.branch.count(),
        this.prisma.product.count(),
        this.prisma.order.count(),
      ]);
      results.schema = {
        status: 'ok',
        latency: `${Date.now() - s}ms`,
      };
      (results.schema as any).counts = { users, branches, products, orders };
    } catch (e: any) {
      results.schema = { status: 'error', error: e.message?.slice(0, 100) };
    }

    // 4. File system (uploads directory writable)
    try {
      const fs = require('fs');
      const path = require('path');
      const testFile = path.join(process.cwd(), 'uploads', '.health-check');
      fs.writeFileSync(testFile, 'ok');
      fs.unlinkSync(testFile);
      results.filesystem = { status: 'ok' };
    } catch (e: any) {
      results.filesystem = { status: 'error', error: e.message?.slice(0, 100) };
    }

    // 5. Memory pressure check
    const mem = process.memoryUsage();
    const heapPercent = Math.round((mem.heapUsed / mem.heapTotal) * 100);
    results.memory = {
      status: heapPercent > 90 ? 'warning' : 'ok',
      latency: `${heapPercent}% heap used`,
    };

    const allOk = Object.values(results).every(r => r.status === 'ok');

    return {
      status: allOk ? 'healthy' : 'degraded',
      totalLatency: `${Date.now() - start}ms`,
      checks: results,
      timestamp: new Date().toISOString(),
    };
  }
}
