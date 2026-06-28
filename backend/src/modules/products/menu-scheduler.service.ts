import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PRODUCT_CHANGED, ProductChangedEvent } from '../../common/events/product-events';

/**
 * MenuSchedulerService — Two automated jobs:
 *
 * 1. **Time-based scheduling** (runs every minute):
 *    Checks products with `scheduleEnabled=true`. If current time is outside
 *    the product's schedule window, marks it unavailable. When the window
 *    opens, marks it available again. Emits real-time events so all clients
 *    update instantly.
 *
 * 2. **Low-stock auto-86** (runs every 5 minutes):
 *    For every sellable MENU product with a recipe, checks if ALL recipe
 *    ingredients have sufficient stock. If any ingredient's total inventory
 *    across the branch is 0, the menu item is auto-disabled with a reason.
 *    When stock is replenished, the item is automatically re-enabled.
 */
@Injectable()
export class MenuSchedulerService {
  private readonly logger = new Logger(MenuSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── TIME-BASED SCHEDULING (every minute) ──────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async handleMenuSchedules() {
    try {
      const products = await this.prisma.product.findMany({
        where: { scheduleEnabled: true, isActive: true, isArchived: false },
        select: { id: true, name: true, isAvailable: true, scheduleStart: true, scheduleEnd: true, scheduleDays: true },
      });

      if (!products.length) return;

      const now = new Date();
      const currentDay = now.getDay(); // 0=Sun..6=Sat
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      for (const product of products) {
        const { scheduleStart, scheduleEnd, scheduleDays } = product;
        if (!scheduleStart || !scheduleEnd) continue;

        // Check if today is a scheduled day (empty array = every day)
        const dayMatch = !scheduleDays?.length || scheduleDays.includes(currentDay);

        // Check if current time is within the schedule window
        let inWindow = false;
        if (dayMatch) {
          if (scheduleStart <= scheduleEnd) {
            // Normal range (e.g., 06:00 - 11:00)
            inWindow = currentTime >= scheduleStart && currentTime < scheduleEnd;
          } else {
            // Overnight range (e.g., 22:00 - 06:00)
            inWindow = currentTime >= scheduleStart || currentTime < scheduleEnd;
          }
        }

        // Toggle availability if it doesn't match current state
        if (inWindow && !product.isAvailable) {
          await this.prisma.product.update({ where: { id: product.id }, data: { isAvailable: true } });
          this.eventEmitter.emit(PRODUCT_CHANGED, {
            productId: product.id,
            action: 'availability',
            data: { isAvailable: true, name: product.name },
          } as ProductChangedEvent);
          this.logger.log(`Schedule ON: ${product.name} (${scheduleStart}-${scheduleEnd})`);
        } else if (!inWindow && product.isAvailable) {
          await this.prisma.product.update({ where: { id: product.id }, data: { isAvailable: false } });
          this.eventEmitter.emit(PRODUCT_CHANGED, {
            productId: product.id,
            action: 'availability',
            data: { isAvailable: false, name: product.name },
          } as ProductChangedEvent);
          this.logger.log(`Schedule OFF: ${product.name} (outside ${scheduleStart}-${scheduleEnd})`);
        }
      }
    } catch (err) {
      this.logger.error(`Menu schedule check failed: ${err}`);
    }
  }

  // ─── LOW-STOCK AUTO-86 (every 5 minutes) ───────────────────────────────

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleLowStockAuto86() {
    try {
      // Get all active menu products that have recipes
      const menuProducts = await this.prisma.product.findMany({
        where: {
          isActive: true,
          isArchived: false,
          isSellable: true,
          productType: 'MENU',
          recipes: { some: { isActive: true } },
        },
        select: {
          id: true,
          name: true,
          isAvailable: true,
          autoEightySixed: true,
          allowNegativeStock: true,
          recipes: {
            where: { isActive: true },
            select: {
              components: {
                select: {
                  componentProductId: true,
                  componentProduct: { select: { id: true, name: true } },
                  quantity: true,
                },
              },
            },
          },
        },
      });

      if (!menuProducts.length) return;

      // Get all ingredient IDs we need to check
      const ingredientIds = new Set<number>();
      for (const mp of menuProducts) {
        for (const recipe of mp.recipes) {
          for (const comp of recipe.components) {
            ingredientIds.add(comp.componentProductId);
          }
        }
      }

      if (!ingredientIds.size) return;

      // Get total stock for each ingredient (sum across all branches)
      const inventoryRecords = await this.prisma.inventory.groupBy({
        by: ['productId'],
        where: { productId: { in: [...ingredientIds] } },
        _sum: { quantity: true },
      });

      const stockMap = new Map<number, number>();
      for (const rec of inventoryRecords) {
        stockMap.set(rec.productId, rec._sum.quantity || 0);
      }

      // Check each menu product's ingredients
      for (const mp of menuProducts) {
        if (mp.allowNegativeStock) continue; // Skip if product allows negative stock

        let outOfStock = false;
        let missingIngredient = '';

        for (const recipe of mp.recipes) {
          for (const comp of recipe.components) {
            const stock = stockMap.get(comp.componentProductId) ?? 0;
            if (stock <= 0) {
              outOfStock = true;
              missingIngredient = comp.componentProduct.name;
              break;
            }
          }
          if (outOfStock) break;
        }

        if (outOfStock && !mp.autoEightySixed) {
          // Auto-disable the menu item
          await this.prisma.product.update({
            where: { id: mp.id },
            data: {
              isAvailable: false,
              autoEightySixed: true,
              autoEightySixReason: `Low stock: ${missingIngredient}`,
            },
          });
          this.eventEmitter.emit(PRODUCT_CHANGED, {
            productId: mp.id,
            action: 'availability',
            data: { isAvailable: false, name: mp.name },
          } as ProductChangedEvent);
          this.logger.warn(`Auto-86: ${mp.name} (${missingIngredient} out of stock)`);
        } else if (!outOfStock && mp.autoEightySixed) {
          // Auto-re-enable the menu item (stock replenished)
          await this.prisma.product.update({
            where: { id: mp.id },
            data: {
              isAvailable: true,
              autoEightySixed: false,
              autoEightySixReason: null,
            },
          });
          this.eventEmitter.emit(PRODUCT_CHANGED, {
            productId: mp.id,
            action: 'availability',
            data: { isAvailable: true, name: mp.name },
          } as ProductChangedEvent);
          this.logger.log(`Auto-restore: ${mp.name} (stock replenished)`);
        }
      }
    } catch (err) {
      this.logger.error(`Low-stock auto-86 check failed: ${err}`);
    }
  }
}
