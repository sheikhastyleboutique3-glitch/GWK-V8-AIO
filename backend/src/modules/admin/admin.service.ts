import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private prisma: PrismaService) {}

  async getSystemStats() {
    const [users, branches, products, requisitions, inventory, wastage, alerts, purchaseOrders, transfers, batches] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.branch.count(),
      this.prisma.product.count(),
      this.prisma.requisition.count(),
      this.prisma.inventory.count(),
      this.prisma.wastageRecord.count(),
      this.prisma.alert.count({ where: { isResolved: false } }),
      this.prisma.purchaseOrder.count(),
      this.prisma.transferOrder.count(),
      this.prisma.batch.count(),
    ]);
    const byStatus = await this.prisma.requisition.groupBy({ by: ['status'], _count: true });
    return {
      counts: { users, branches, products, requisitions, inventory, wastage, alerts, purchaseOrders, transfers, batches },
      byStatus,
      timestamp: new Date().toISOString(),
    };
  }

  private async resetSequence(tableName: string): Promise<void> {
    // SAFETY: Validate table name is alphanumeric + underscores only (prevent injection)
    if (!/^[a-z_][a-z0-9_]*$/i.test(tableName)) {
      this.logger.warn(`Invalid table name rejected: ${tableName}`);
      return;
    }
    try {
      const result = await this.prisma.$queryRawUnsafe<{ seq_name: string | null }[]>(
        `SELECT pg_get_serial_sequence('"${tableName}"', 'id') as seq_name`,
      );
      const seqName = result?.[0]?.seq_name;
      if (seqName) {
        // Align the sequence with the current MAX(id) so the next insert is
        // MAX(id)+1. When the table is empty this resets it to 1. This is
        // correct whether operational data was purged OR master data was kept
        // (a plain "RESTART WITH 1" collides with kept rows that still hold
        // ids 1..N).
        await this.prisma.$executeRawUnsafe(
          `SELECT setval(
             '${seqName}',
             COALESCE((SELECT MAX(id) FROM "${tableName}"), 1),
             (SELECT MAX(id) FROM "${tableName}") IS NOT NULL
           )`,
        );
        this.logger.log(`Sequence realigned for ${tableName}: ${seqName}`);
      }
    } catch (e) {
      this.logger.warn(`Could not reset sequence for ${tableName}: ${(e as Error).message}`);
    }
  }

  async resetSystem(userId: number, confirmPhrase: string, keepMasterData: boolean) {
    this.logger.log(`Reset system requested by user ${userId}, keepMasterData: ${keepMasterData}`);
    if (!confirmPhrase) throw new BadRequestException('Confirmation phrase is required');
    if (typeof keepMasterData !== 'boolean') throw new BadRequestException('keepMasterData must be a boolean');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');
    if (confirmPhrase !== 'PURGE-ALL-OPERATIONAL-DATA-TO-ZERO') {
      throw new BadRequestException('Wrong confirmation phrase. Required: "PURGE-ALL-OPERATIONAL-DATA-TO-ZERO"');
    }

    this.logger.log('Validation passed, starting data deletion...');

    // Phase 1: Delete order-related data (FK-safe order: children first)
    await this.prisma.$transaction([
      // Order lifecycle
      this.prisma.orderCourse.deleteMany(),
      this.prisma.orderTableMove.deleteMany(),
      this.prisma.payment.deleteMany(),
      this.prisma.orderItem.deleteMany(),
      this.prisma.orderDelivery.deleteMany(),
      this.prisma.order.deleteMany(),
      // POS sessions
      this.prisma.posCashMovement.deleteMany(),
      this.prisma.posCashCountLine.deleteMany(),
      this.prisma.posCashCount.deleteMany(),
      this.prisma.posSession.deleteMany(),
      // Finance
      this.prisma.financeEntry.deleteMany(),
    ]);
    this.logger.log('Phase 1: Orders, payments, sessions, finance cleared');

    // Phase 2: Delete operational/transactional data
    await this.prisma.$transaction([
      // Inventory operations
      this.prisma.auditLog.deleteMany(),
      this.prisma.alert.deleteMany(),
      this.prisma.wastageRecord.deleteMany(),
      this.prisma.inventoryTransaction.deleteMany(),
      this.prisma.inventory.deleteMany(),
      // Transfers and batches
      this.prisma.transferOrderItem.deleteMany(),
      this.prisma.transferOrder.deleteMany(),
      this.prisma.batch.deleteMany(),
      // Procurement
      this.prisma.requisitionDispatch.deleteMany(),
      this.prisma.requisitionStatusHistory.deleteMany(),
      this.prisma.requisitionItem.deleteMany(),
      this.prisma.requisition.deleteMany(),
      this.prisma.purchaseOrderItem.deleteMany(),
      this.prisma.purchaseOrder.deleteMany(),
      this.prisma.supplierPriceHistory.deleteMany(),
      // Notifications
      this.prisma.notification.deleteMany(),
      this.prisma.userNotificationPreference.deleteMany(),
      this.prisma.notificationConfig.deleteMany(),
      // Staff
      this.prisma.staffShift.deleteMany(),
      // Production
      this.prisma.productionConsumption.deleteMany(),
      this.prisma.productionOrder.deleteMany(),
      // Stock counts
      this.prisma.stockCountItem.deleteMany(),
      this.prisma.stockCount.deleteMany(),
      // Reservations
      this.prisma.reservation.deleteMany(),
      // Customer loyalty
      this.prisma.loyaltyCard.deleteMany(),
      // Deliveries (driver GPS)
      this.prisma.driverLocation.deleteMany(),
      // System logs
      this.prisma.systemResetLog.deleteMany(),
    ]);
    this.logger.log('Phase 2: All transactional data cleared');

    // Reset sequences for all transactional tables
    const transactionalTables = [
      'orders', 'order_items', 'payments', 'order_courses', 'order_table_moves',
      'order_deliveries', 'pos_sessions', 'pos_cash_movements', 'pos_cash_counts',
      'pos_cash_count_lines', 'finance_entries',
      'audit_logs', 'alerts', 'wastage_records', 'inventory_transactions',
      'inventory', 'transfer_order_items', 'transfer_orders', 'batches',
      'requisition_dispatches', 'requisition_status_history',
      'requisition_items', 'requisitions', 'purchase_order_items',
      'purchase_orders', 'supplier_price_history',
      'notifications', 'user_notification_preferences', 'notification_configs',
      'staff_shifts', 'production_consumptions', 'production_orders',
      'stock_count_items', 'stock_counts', 'reservations',
      'loyalty_cards', 'driver_locations', 'system_reset_logs',
    ];
    for (const table of transactionalTables) await this.resetSequence(table);

    if (!keepMasterData) {
      this.logger.log('Deleting master data...');
      await this.prisma.$transaction([
        this.prisma.recipeComponent.deleteMany(),
        this.prisma.recipe.deleteMany(),
        this.prisma.comboChoice.deleteMany(),
        this.prisma.comboLine.deleteMany(),
        this.prisma.combo.deleteMany(),
        this.prisma.pricelistItem.deleteMany(),
        this.prisma.pricelist.deleteMany(),
        this.prisma.productModifierGroup.deleteMany(),
        this.prisma.modifierOption.deleteMany(),
        this.prisma.modifierGroup.deleteMany(),
        this.prisma.productTax.deleteMany(),
        this.prisma.productAttributeLine.deleteMany(),
        this.prisma.productVariant.deleteMany(),
        this.prisma.product.deleteMany(),
        this.prisma.category.deleteMany(),
        this.prisma.unit.deleteMany(),
        this.prisma.supplier.deleteMany(),
        this.prisma.customer.deleteMany(),
        this.prisma.coupon.deleteMany(),
        this.prisma.loyaltyReward.deleteMany(),
        this.prisma.loyaltyRule.deleteMany(),
        this.prisma.loyaltyProgram.deleteMany(),
        this.prisma.driver.deleteMany(),
        this.prisma.deliveryPlatform.deleteMany(),
        this.prisma.discountRule.deleteMany(),
        this.prisma.restaurantTable.deleteMany(),
        this.prisma.restaurantFloor.deleteMany(),
        this.prisma.user.deleteMany({ where: { role: { not: 'SUPER_ADMIN' } } }),
        this.prisma.userBranch.deleteMany({ where: { user: { role: { not: 'SUPER_ADMIN' } } } }),
        this.prisma.userView.deleteMany(),
      ]);
      const masterTables = [
        'products', 'categories', 'units', 'suppliers', 'customers',
        'recipes', 'recipe_components', 'combos', 'combo_lines', 'combo_choices',
        'pricelists', 'pricelist_items', 'modifier_groups', 'modifier_options',
        'product_modifier_groups', 'product_taxes', 'product_attribute_lines',
        'product_variants', 'coupons', 'loyalty_programs', 'loyalty_rules',
        'loyalty_rewards', 'drivers', 'delivery_platforms', 'discount_rules',
        'restaurant_tables', 'restaurant_floors', 'user_branches', 'user_views',
      ];
      for (const table of masterTables) await this.resetSequence(table);
      this.logger.log('Master data deleted');
    }

    try {
      await this.prisma.systemResetLog.create({
        data: { userId, resetType: keepMasterData ? 'TRANSACTION_WIPE' : 'FULL_WIPE', details: { timestamp: new Date().toISOString(), keepMasterData } },
      });
    } catch (e) {
      this.logger.warn('Could not log to SystemResetLog: ' + (e as Error).message);
    }

    return {
      success: true,
      message: keepMasterData
        ? 'All operational data cleared (orders, payments, sessions, inventory, finance, procurement, production, deliveries, reservations, notifications, shifts). Master data preserved (products, users, categories, branches).'
        : 'Full wipe complete. Only Super Admin accounts retained. All sequences reset.',
      action: keepMasterData ? 'TRANSACTION_WIPE' : 'FULL_WIPE',
    };
  }

  /**
   * Granular module reset — clears only one specific area of data.
   * Safer than a full wipe; allows targeted cleanup without affecting other modules.
   */
  async resetModule(userId: number, confirmPhrase: string, module: string) {
    const expected = `RESET-${module.toUpperCase()}`;
    if (confirmPhrase !== expected) {
      throw new BadRequestException(`Wrong confirmation phrase. Required: "${expected}"`);
    }

    this.logger.log(`Module reset: ${module} by user ${userId}`);

    switch (module) {
      case 'sales':
        await this.prisma.$transaction([
          this.prisma.orderCourse.deleteMany(),
          this.prisma.orderTableMove.deleteMany(),
          this.prisma.payment.deleteMany(),
          this.prisma.orderItem.deleteMany(),
          this.prisma.orderDelivery.deleteMany(),
          this.prisma.order.deleteMany(),
          this.prisma.posCashMovement.deleteMany(),
          this.prisma.posCashCountLine.deleteMany(),
          this.prisma.posCashCount.deleteMany(),
          this.prisma.posSession.deleteMany(),
        ]);
        for (const t of ['orders', 'order_items', 'payments', 'order_courses', 'order_table_moves', 'order_deliveries', 'pos_sessions', 'pos_cash_movements', 'pos_cash_counts', 'pos_cash_count_lines']) {
          await this.resetSequence(t);
        }
        await this.prisma.restaurantTable.updateMany({ data: { status: 'AVAILABLE' } });
        return { success: true, message: 'Sales data cleared: all orders, payments, POS sessions deleted. Tables reset to AVAILABLE.', module: 'sales' };

      case 'inventory':
        await this.prisma.$transaction([
          this.prisma.inventoryTransaction.deleteMany(),
          this.prisma.inventory.deleteMany(),
          this.prisma.transferOrderItem.deleteMany(),
          this.prisma.transferOrder.deleteMany(),
          this.prisma.batch.deleteMany(),
          this.prisma.stockCountItem.deleteMany(),
          this.prisma.stockCount.deleteMany(),
          this.prisma.productionConsumption.deleteMany(),
          this.prisma.productionOrder.deleteMany(),
          this.prisma.wastageRecord.deleteMany(),
        ]);
        for (const t of ['inventory', 'inventory_transactions', 'transfer_orders', 'transfer_order_items', 'batches', 'stock_counts', 'stock_count_items', 'production_orders', 'production_consumptions', 'wastage_records']) {
          await this.resetSequence(t);
        }
        return { success: true, message: 'Inventory data cleared: all stock, batches, transfers, production, wastage deleted.', module: 'inventory' };

      case 'finance':
        await this.prisma.financeEntry.deleteMany();
        await this.resetSequence('finance_entries');
        return { success: true, message: 'Finance data cleared: all journal entries deleted.', module: 'finance' };

      case 'procurement':
        await this.prisma.$transaction([
          this.prisma.requisitionDispatch.deleteMany(),
          this.prisma.requisitionStatusHistory.deleteMany(),
          this.prisma.requisitionItem.deleteMany(),
          this.prisma.requisition.deleteMany(),
          this.prisma.purchaseOrderItem.deleteMany(),
          this.prisma.purchaseOrder.deleteMany(),
          this.prisma.supplierPriceHistory.deleteMany(),
        ]);
        for (const t of ['requisitions', 'requisition_items', 'requisition_status_history', 'requisition_dispatches', 'purchase_orders', 'purchase_order_items', 'supplier_price_history']) {
          await this.resetSequence(t);
        }
        return { success: true, message: 'Procurement data cleared: all requisitions, POs, price history deleted.', module: 'procurement' };

      case 'notifications':
        await this.prisma.$transaction([
          this.prisma.notification.deleteMany(),
          this.prisma.alert.deleteMany(),
          this.prisma.auditLog.deleteMany(),
        ]);
        for (const t of ['notifications', 'alerts', 'audit_logs']) {
          await this.resetSequence(t);
        }
        return { success: true, message: 'Notifications cleared: all alerts, inbox, audit logs deleted.', module: 'notifications' };

      default:
        throw new BadRequestException(`Unknown module: ${module}. Valid: sales, inventory, finance, procurement, notifications`);
    }
  }

  /**
   * Delete a single record by entity type + id.
   * Handles FK-safe cascading deletion for each type.
   */
  async deleteRecord(type: string, id: number, requestedByUserId: number) {
    this.logger.log(`Admin delete: type=${type} id=${id} by user=${requestedByUserId}`);

    switch (type) {
      case 'requisition': {
        const exists = await this.prisma.requisition.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException(`Requisition #${id} not found`);
        // Delete in FK-safe order
        await this.prisma.$transaction([
          this.prisma.requisitionDispatch.deleteMany({ where: { requisitionId: id } }),
          this.prisma.requisitionStatusHistory.deleteMany({ where: { requisitionId: id } }),
          this.prisma.requisitionItem.deleteMany({ where: { requisitionId: id } }),
          this.prisma.requisition.delete({ where: { id } }),
        ]);
        return { success: true, message: `Requisition #${id} (${exists.requisitionNo}) deleted` };
      }

      case 'purchase-order': {
        const exists = await this.prisma.purchaseOrder.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException(`Purchase Order #${id} not found`);
        await this.prisma.$transaction([
          this.prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } }),
          this.prisma.purchaseOrder.delete({ where: { id } }),
        ]);
        return { success: true, message: `Purchase Order #${id} (${exists.poNumber}) deleted` };
      }

      case 'wastage': {
        const exists = await this.prisma.wastageRecord.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException(`Wastage record #${id} not found`);
        await this.prisma.wastageRecord.delete({ where: { id } });
        return { success: true, message: `Wastage record #${id} deleted` };
      }

      case 'alert': {
        const exists = await this.prisma.alert.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException(`Alert #${id} not found`);
        await this.prisma.alert.delete({ where: { id } });
        return { success: true, message: `Alert #${id} deleted` };
      }

      case 'inventory': {
        const exists = await this.prisma.inventory.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException(`Inventory record #${id} not found`);
        await this.prisma.$transaction([
          this.prisma.inventoryTransaction.deleteMany({ where: { productId: exists.productId, branchId: exists.branchId } }),
          this.prisma.inventory.delete({ where: { id } }),
        ]);
        return { success: true, message: `Inventory record #${id} deleted` };
      }

      case 'audit-log': {
        const exists = await this.prisma.auditLog.findUnique({ where: { id } });
        if (!exists) throw new NotFoundException(`Audit log #${id} not found`);
        await this.prisma.auditLog.delete({ where: { id } });
        return { success: true, message: `Audit log #${id} deleted` };
      }

      default:
        throw new BadRequestException(`Unknown record type: ${type}. Valid: requisition, purchase-order, wastage, alert, inventory, audit-log`);
    }
  }
}
