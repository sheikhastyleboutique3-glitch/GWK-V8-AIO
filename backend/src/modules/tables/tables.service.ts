import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ReservationStatus, TableShape, TableStatus } from '@prisma/client';
import { TABLE_CHANGED } from '../../common/events/realtime-events';

@Injectable()
export class TablesService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  // ---- Floors (areas / zones) ----
  listFloors(branchId?: number) {
    return this.prisma.restaurantFloor.findMany({
      where: { ...(branchId ? { branchId } : {}), isActive: true },
      include: { tables: { where: { isActive: true }, orderBy: { name: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  createFloor(dto: { branchId: number; name: string; nameAr?: string; background?: string }) {
    return this.prisma.restaurantFloor.create({
      data: { branchId: dto.branchId, name: dto.name, nameAr: dto.nameAr, background: dto.background },
    });
  }

  async updateFloor(id: number, dto: { name?: string; nameAr?: string; background?: string; sortOrder?: number; isActive?: boolean }) {
    const f = await this.prisma.restaurantFloor.findUnique({ where: { id } });
    if (!f) throw new NotFoundException(`Floor ${id} not found`);
    return this.prisma.restaurantFloor.update({ where: { id }, data: dto });
  }

  async removeFloor(id: number) {
    const f = await this.prisma.restaurantFloor.findUnique({ where: { id } });
    if (!f) throw new NotFoundException(`Floor ${id} not found`);
    return this.prisma.restaurantFloor.update({ where: { id }, data: { isActive: false } });
  }

  // ---- Tables ----
  listTables(branchId?: number, floorId?: number) {
    return this.prisma.restaurantTable.findMany({
      where: { ...(branchId ? { branchId } : {}), ...(floorId ? { floorId } : {}) },
      include: { floor: { select: { id: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  createTable(dto: { branchId: number; name: string; seats?: number; floorId?: number; shape?: TableShape; posX?: number; posY?: number; width?: number; height?: number }) {
    return this.prisma.restaurantTable.create({
      data: {
        branchId: dto.branchId,
        name: dto.name,
        seats: dto.seats ?? 2,
        floorId: dto.floorId ?? null,
        shape: dto.shape ?? TableShape.SQUARE,
        posX: dto.posX ?? 0,
        posY: dto.posY ?? 0,
        width: dto.width ?? 80,
        height: dto.height ?? 80,
      },
    });
  }

  async updateTable(
    id: number,
    dto: {
      name?: string; seats?: number; status?: TableStatus; isActive?: boolean;
      floorId?: number | null; shape?: TableShape;
      posX?: number; posY?: number; width?: number; height?: number;
    },
  ) {
    await this.getTable(id);
    return this.prisma.restaurantTable.update({ where: { id }, data: dto as any });
  }

  /** Bulk update positions (drag-and-drop save all at once). */
  async bulkUpdatePositions(updates: { id: number; posX: number; posY: number; width?: number; height?: number; shape?: TableShape; seats?: number }[]) {
    const results = [];
    for (const u of updates) {
      const data: any = { posX: u.posX, posY: u.posY };
      if (u.width != null) data.width = u.width;
      if (u.height != null) data.height = u.height;
      if (u.shape != null) data.shape = u.shape;
      if (u.seats != null) data.seats = u.seats;
      results.push(await this.prisma.restaurantTable.update({ where: { id: u.id }, data }));
    }
    return results;
  }

  async getTable(id: number) {
    const t = await this.prisma.restaurantTable.findUnique({ where: { id } });
    if (!t) throw new NotFoundException(`Table ${id} not found`);
    return t;
  }

  async removeTable(id: number) {
    await this.getTable(id);
    return this.prisma.restaurantTable.update({ where: { id }, data: { isActive: false } });
  }

  /**
   * Atomic table claim — prevents race condition where two waiters open the
   * same table simultaneously and create duplicate orders. Uses a serializable
   * transaction with row-locking to ensure only one order is created.
   *
   * Returns: { action: 'created' | 'resumed' | 'existing', orderId: number }
   */
  async claimTable(tableId: number, branchId: number, userId?: number) {
    const result = await this.prisma.$transaction(
      async (tx) => {
        // Lock the table row to prevent concurrent claims
        const [table] = await tx.$queryRaw<Array<{ id: number; name: string; status: string }>>`
          SELECT id, name, status FROM restaurant_tables
          WHERE id = ${tableId} FOR UPDATE
        `;
        if (!table) throw new NotFoundException(`Table ${tableId} not found`);

        // Check if there's already an OPEN/HELD order for this table
        const existingOrder = await tx.order.findFirst({
          where: {
            branchId,
            tableName: table.name,
            status: { in: ['OPEN', 'HELD'] },
          },
          select: { id: true, status: true },
          orderBy: { createdAt: 'desc' },
        });

        if (existingOrder) {
          // Resume if HELD, otherwise return existing
          if (existingOrder.status === 'HELD') {
            await tx.order.update({
              where: { id: existingOrder.id },
              data: { status: 'OPEN' },
            });
            return { action: 'resumed' as const, orderId: existingOrder.id };
          }
          return { action: 'existing' as const, orderId: existingOrder.id };
        }

        // No existing order — create a new one (atomically, inside the lock)
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const [{ nextval }] = await tx.$queryRaw<[{ nextval: bigint }]>`
          SELECT nextval(pg_get_serial_sequence('orders', 'id'))`;
        const orderNo = `ORD-${stamp}-B${branchId}-${String(Number(nextval)).padStart(5, '0')}`;

        // Check for an open session
        const session = await tx.posSession.findFirst({
          where: { branchId, status: 'OPEN' },
          select: { id: true },
        });

        const order = await tx.order.create({
          data: {
            orderNo,
            branchId,
            channel: 'DINE_IN',
            tableName: table.name,
            tableId,
            sessionId: session?.id ?? null,
            createdById: userId ?? null,
          },
        });

        // Mark the table as occupied
        await tx.restaurantTable.update({
          where: { id: tableId },
          data: { status: 'OCCUPIED' },
        });

        return { action: 'created' as const, orderId: order.id };
      },
      { isolationLevel: 'Serializable', timeout: 10_000 },
    );

    // Emit table change event after transaction commits (for live floor plan updates)
    this.events.emit(TABLE_CHANGED, {
      branchId,
      tableId,
      tableName: result.action === 'created' ? '' : '', // will be populated by the caller context
      status: 'OCCUPIED',
      action: result.action === 'created' ? 'opened' : 'status_changed',
    });

    return result;
  }

  // ---- Reservations ----
  listReservations(filters?: { branchId?: number; status?: ReservationStatus; date?: string }) {
    const where: any = {};
    if (filters?.branchId) where.branchId = filters.branchId;
    if (filters?.status) where.status = filters.status;
    if (filters?.date) {
      where.reservedAt = {
        gte: new Date(filters.date + 'T00:00:00.000Z'),
        lte: new Date(filters.date + 'T23:59:59.999Z'),
      };
    }
    return this.prisma.reservation.findMany({ where, orderBy: { reservedAt: 'asc' }, take: 200 });
  }

  createReservation(
    dto: {
      branchId: number;
      reservedAt: string;
      tableId?: number;
      customerId?: number;
      customerName?: string;
      phone?: string;
      partySize?: number;
      notes?: string;
    },
    userId?: number,
  ) {
    return this.prisma.reservation.create({
      data: {
        branchId: dto.branchId,
        reservedAt: new Date(dto.reservedAt),
        tableId: dto.tableId ?? null,
        customerId: dto.customerId ?? null,
        customerName: dto.customerName,
        phone: dto.phone,
        partySize: dto.partySize ?? 2,
        notes: dto.notes,
        createdById: userId ?? null,
      },
    });
  }

  async setReservationStatus(id: number, status: ReservationStatus) {
    const r = await this.prisma.reservation.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Reservation ${id} not found`);
    // Reflect onto the table where it makes sense.
    if (r.tableId && (status === ReservationStatus.SEATED || status === ReservationStatus.BOOKED)) {
      await this.prisma.restaurantTable.update({
        where: { id: r.tableId },
        data: { status: status === ReservationStatus.SEATED ? TableStatus.OCCUPIED : TableStatus.RESERVED },
      });
    }
    if (r.tableId && (status === ReservationStatus.COMPLETED || status === ReservationStatus.CANCELLED || status === ReservationStatus.NO_SHOW)) {
      await this.prisma.restaurantTable.update({
        where: { id: r.tableId },
        data: { status: TableStatus.AVAILABLE },
      });
    }
    return this.prisma.reservation.update({ where: { id }, data: { status } });
  }
}
