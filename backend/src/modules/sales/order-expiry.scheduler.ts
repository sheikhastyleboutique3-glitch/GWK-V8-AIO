/**
 * Order Expiry Scheduler — Auto-voids HELD orders older than a configurable threshold.
 *
 * Runs every 15 minutes. Configurable via the `pos.held_order_expiry_hours` setting
 * (default: 4 hours). Orders in HELD status longer than this are automatically voided
 * to keep the order queue clean and free up tables.
 *
 * Emits ORDER_CHANGED events so connected clients see the voided orders in real-time.
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';
import { ORDER_CHANGED } from '../../common/events/realtime-events';

@Injectable()
export class OrderExpiryScheduler {
  private readonly logger = new Logger(OrderExpiryScheduler.name);

  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
  ) {}

  /** Runs every 15 minutes — voids HELD orders older than configured threshold. */
  @Cron('0 */15 * * * *')
  async handleExpiredHeldOrders() {
    try {
      // Get configurable expiry hours (default: 4 hours)
      const setting = await this.prisma.setting.findUnique({
        where: { key: 'pos.held_order_expiry_hours' },
      });
      const expiryHours = parseFloat(setting?.value || '4');
      if (expiryHours <= 0) return; // Disabled if set to 0

      const cutoff = new Date(Date.now() - expiryHours * 60 * 60 * 1000);

      // Find all HELD orders older than the cutoff
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          status: OrderStatus.HELD,
          updatedAt: { lt: cutoff },
        },
        select: { id: true, orderNo: true, branchId: true, tableName: true },
      });

      if (!expiredOrders.length) return;

      // Void them in batch
      await this.prisma.order.updateMany({
        where: { id: { in: expiredOrders.map((o) => o.id) } },
        data: { status: OrderStatus.VOIDED },
      });

      // Emit events for real-time UI updates
      for (const order of expiredOrders) {
        this.events.emit(ORDER_CHANGED, {
          branchId: order.branchId,
          orderId: order.id,
          orderNo: order.orderNo,
          action: 'voided',
          tableName: order.tableName,
        });
      }

      // Free up tables occupied by expired orders
      const tableNames = expiredOrders.map((o) => o.tableName).filter(Boolean) as string[];
      if (tableNames.length) {
        await this.prisma.restaurantTable.updateMany({
          where: { name: { in: tableNames }, status: 'OCCUPIED' },
          data: { status: 'AVAILABLE' },
        });
      }

      this.logger.log(
        `Auto-voided ${expiredOrders.length} expired held order(s): ${expiredOrders.map((o) => o.orderNo).join(', ')}`,
      );
    } catch (err) {
      this.logger.error(`Order expiry check failed: ${err}`);
    }
  }
}
