import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * AuditService — Comprehensive activity logging for the entire system.
 *
 * Every significant action is recorded with:
 * - WHO did it (userId + resolved name)
 * - WHAT they did (action + entity type)
 * - WHICH record (entityId — always present, never null)
 * - WHEN (timestamp)
 * - WHAT CHANGED (oldValues → newValues diff)
 * - WHERE to find it (link — navigation path for the frontend)
 *
 * The audit trail is:
 * - Immutable (never updated or deleted in normal operation)
 * - Non-blocking (failures logged but never affect the business action)
 * - Searchable (by entity, action, user, date range, or free text)
 * - Navigable (link field lets the UI jump to the related record)
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  findAll(filters?: {
    entity?: string;
    action?: string;
    userId?: number;
    search?: string;
    from?: string;
    to?: string;
    limit?: number;
    entityId?: string;
  }) {
    const where: any = {};
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.action) where.action = filters.action;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.entityId) where.entityId = filters.entityId;
    if (filters?.search) {
      where.OR = [
        { entityId: { contains: filters.search, mode: 'insensitive' } },
        { action: { contains: filters.search, mode: 'insensitive' } },
        { entity: { contains: filters.search, mode: 'insensitive' } },
        // Search inside JSON values (newValues may contain names, descriptions, etc.)
        { newValues: { path: [], string_contains: filters.search } },
      ];
    }
    if (filters?.from || filters?.to) {
      where.createdAt = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to + 'T23:59:59.999Z') } : {}),
      };
    }
    return this.prisma.auditLog.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 200,
    });
  }

  /** Get all audit entries for a specific record (entity + entityId). */
  findByRecord(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entity, entityId },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Get audit entries for a specific user (their activity timeline). */
  findByUser(userId: number, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /** Get unique entity types in the audit log (for filter dropdown). */
  async getEntityTypes(): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      select: { entity: true },
      distinct: ['entity'],
      orderBy: { entity: 'asc' },
    });
    return result.map(r => r.entity);
  }

  /** Get unique actions in the audit log (for filter dropdown). */
  async getActionTypes(): Promise<string[]> {
    const result = await this.prisma.auditLog.findMany({
      select: { action: true },
      distinct: ['action'],
      orderBy: { action: 'asc' },
    });
    return result.map(r => r.action);
  }

  /**
   * Log an audit entry. Non-blocking — NEVER throws.
   *
   * Usage:
   *   this.audit.log({
   *     userId: 5,
   *     action: 'COMPLETE',
   *     entity: 'order',
   *     entityId: '42',
   *     description: 'Order ORD-20260628-B2-00042 completed',
   *     oldValues: { status: 'OPEN', total: 150 },
   *     newValues: { status: 'COMPLETED', total: 150, foodCost: 45 },
   *   });
   */
  log(data: {
    userId?: number;
    action: string;
    entity: string;
    entityId: string;
    description?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
  }): void {
    // Fire and forget — never block the business action
    this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        oldValues: data.oldValues ?? undefined,
        newValues: data.newValues ?? undefined,
        ipAddress: data.ipAddress ?? undefined,
      },
    }).catch((err) => {
      this.logger.warn(`Audit log failed (${data.entity}/${data.entityId}): ${err.message}`);
    });
  }

  /**
   * Legacy method — kept for backward compatibility.
   * Prefer using `log()` for new code (same behavior, clearer name).
   */
  create(data: {
    userId?: number;
    action: string;
    entity: string;
    entityId?: string;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string;
  }) {
    // Ensure entityId is always present (fallback to 'unknown' if caller forgot)
    const entityId = data.entityId || 'unknown';
    this.log({ ...data, entityId });
    // Return a resolved promise for callers that await this
    return Promise.resolve();
  }

  /** Bulk audit log — for batch operations (import, bulk update, etc.) */
  async logBulk(entries: Array<{
    userId?: number;
    action: string;
    entity: string;
    entityId: string;
    newValues?: any;
  }>): Promise<void> {
    if (!entries.length) return;
    try {
      await this.prisma.auditLog.createMany({
        data: entries.map(e => ({
          userId: e.userId ?? null,
          action: e.action,
          entity: e.entity,
          entityId: e.entityId,
          newValues: e.newValues ?? undefined,
        })),
      });
    } catch (err) {
      this.logger.warn(`Bulk audit log failed (${entries.length} entries): ${(err as Error).message}`);
    }
  }

  /** Get summary counts by entity type (for admin dashboard). */
  async getSummary(from?: string, to?: string) {
    const where: any = {};
    if (from || to) {
      where.createdAt = {
        ...(from ? { gte: new Date(from) } : {}),
        ...(to ? { lte: new Date(to + 'T23:59:59.999Z') } : {}),
      };
    }
    const byEntity = await this.prisma.auditLog.groupBy({
      by: ['entity'],
      where,
      _count: { _all: true },
      orderBy: { _count: { entity: 'desc' } },
    });
    const byAction = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: { _all: true },
      orderBy: { _count: { action: 'desc' } },
    });
    const byUser = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: { ...where, userId: { not: null } },
      _count: { _all: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    });
    const total = await this.prisma.auditLog.count({ where });
    return { total, byEntity, byAction, byUser };
  }
}
