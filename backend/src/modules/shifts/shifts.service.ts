import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

/**
 * Staff Shift Scheduling — Clock in/out + shift calendar.
 *
 * Managers create shifts (scheduled start/end per user per branch).
 * Staff clock in/out, which records actual times.
 * Reports show punctuality, overtime, and missed shifts.
 */
@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  /** List shifts for a branch or user within a date range. */
  findAll(filters?: { branchId?: number; userId?: number; from?: string; to?: string; status?: string }) {
    const where: any = {};
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.status) where.status = filters.status;
    if (filters?.from || filters?.to) {
      where.scheduledStart = {
        ...(filters.from ? { gte: new Date(filters.from) } : {}),
        ...(filters.to ? { lte: new Date(filters.to + 'T23:59:59.999Z') } : {}),
      };
    }
    return this.prisma.staffShift.findMany({
      where,
      orderBy: { scheduledStart: 'asc' },
      take: 500,
    });
  }

  /** Create a new scheduled shift. */
  create(dto: { userId: number; branchId: number; scheduledStart: string; scheduledEnd: string; notes?: string }) {
    return this.prisma.staffShift.create({
      data: {
        userId: dto.userId,
        branchId: dto.branchId,
        scheduledStart: new Date(dto.scheduledStart),
        scheduledEnd: new Date(dto.scheduledEnd),
        notes: dto.notes,
      },
    });
  }

  /** Bulk create shifts (weekly schedule). */
  async createBulk(shifts: { userId: number; branchId: number; scheduledStart: string; scheduledEnd: string }[]) {
    const data = shifts.map(s => ({
      userId: s.userId,
      branchId: s.branchId,
      scheduledStart: new Date(s.scheduledStart),
      scheduledEnd: new Date(s.scheduledEnd),
      status: 'SCHEDULED' as const,
    }));
    return this.prisma.staffShift.createMany({ data });
  }

  /** Clock in — staff starts their shift. */
  async clockIn(shiftId: number) {
    const shift = await this.prisma.staffShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    if (shift.status !== 'SCHEDULED') throw new BadRequestException(`Shift is already ${shift.status}`);
    return this.prisma.staffShift.update({
      where: { id: shiftId },
      data: { status: 'CLOCKED_IN', actualStart: new Date() },
    });
  }

  /** Clock out — staff ends their shift. */
  async clockOut(shiftId: number) {
    const shift = await this.prisma.staffShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new NotFoundException(`Shift ${shiftId} not found`);
    if (shift.status !== 'CLOCKED_IN') throw new BadRequestException(`Must be clocked in to clock out`);
    return this.prisma.staffShift.update({
      where: { id: shiftId },
      data: { status: 'CLOCKED_OUT', actualEnd: new Date() },
    });
  }

  /** Quick clock in/out for a user (finds their current shift). */
  async quickClock(userId: number, branchId: number) {
    // Find active clocked-in shift
    const active = await this.prisma.staffShift.findFirst({
      where: { userId, branchId, status: 'CLOCKED_IN' },
    });
    if (active) {
      // Clock out
      return this.clockOut(active.id);
    }
    // Find the next scheduled shift for today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const scheduled = await this.prisma.staffShift.findFirst({
      where: { userId, branchId, status: 'SCHEDULED', scheduledStart: { gte: today, lt: tomorrow } },
      orderBy: { scheduledStart: 'asc' },
    });
    if (scheduled) {
      return this.clockIn(scheduled.id);
    }
    // No shift found — create an ad-hoc shift and clock in
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const adhoc = await this.prisma.staffShift.create({
      data: { userId, branchId, scheduledStart: new Date(), scheduledEnd: endOfDay, status: 'CLOCKED_IN', actualStart: new Date() },
    });
    return adhoc;
  }

  /** Cancel a shift. */
  cancel(shiftId: number) {
    return this.prisma.staffShift.update({
      where: { id: shiftId },
      data: { status: 'CANCELLED' },
    });
  }

  /** Attendance report: hours worked per user in a period. */
  async attendanceReport(branchId: number, from: string, to: string) {
    const shifts = await this.prisma.staffShift.findMany({
      where: {
        branchId,
        status: 'CLOCKED_OUT',
        actualStart: { gte: new Date(from) },
        actualEnd: { lte: new Date(to + 'T23:59:59.999Z') },
      },
    });
    const byUser = new Map<number, { hoursWorked: number; shifts: number; lateArrivals: number }>();
    for (const s of shifts) {
      if (!s.actualStart || !s.actualEnd) continue;
      const hours = (s.actualEnd.getTime() - s.actualStart.getTime()) / 3600000;
      const entry = byUser.get(s.userId) || { hoursWorked: 0, shifts: 0, lateArrivals: 0 };
      entry.hoursWorked += hours;
      entry.shifts += 1;
      if (s.actualStart > s.scheduledStart) entry.lateArrivals += 1;
      byUser.set(s.userId, entry);
    }
    return Array.from(byUser.entries()).map(([userId, data]) => ({ userId, ...data }));
  }
}
