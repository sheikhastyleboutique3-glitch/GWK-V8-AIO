# Sales Module — Architecture

## Current Structure (v1.1)

```
sales/
├── sales.service.ts          (1476 lines — main business logic)
├── sales.controller.ts       (endpoints + DTOs)
├── sales.module.ts           (DI wiring)
├── order-completed.listener.ts (event handler for post-sale side effects)
├── order-expiry.scheduler.ts  (auto-void held orders after 4h)
└── README.md                 (this file)
```

## Method Groups (for Sprint 2 decomposition)

### Group 1: Order Creation (lines 119–402)
- `generateOrderNo()` — atomic sequence-based order number
- `commissionFor()` — aggregator commission calculation
- `create()` — full order creation with idempotency, pricelist, combos, coupons

### Group 2: Order Completion & Finance (lines 1044–1476)
- `addPayment()` — multi-tender payment recording
- `complete()` — FEFO stock deduction, cost capture, finance journal, loyalty
- `refund()` — full refund with inventory restock + finance reversal
- `partialRefund()` — per-item refund
- `returnWithoutReceipt()` — manual refund entry
- `correctPaymentMethod()` — post-sale payment method fix

### Group 3: Order Modification (lines 414–784)
- `addItem()` / `removeItem()` / `updateItem()` — line item CRUD with merge
- `applyCoupon()` / `applyDiscountRule()` / `applyTip()` — pricing adjustments
- `transferTable()` / `fireCourse()` — restaurant operations
- `merge()` / `split()` / `splitBySeat()` / `setItemSeat()` — bill management
- `voidOrder()` / `setStatus()` / `updateOrder()` — order lifecycle

### Group 4: Queries & Utilities (lines 155–213, 403–413, 604–616)
- `findAll()` / `findOne()` — paginated order queries
- `recompute()` — recalculate totals after modifications
- `assertOpen()` — validate order is modifiable
- `freeTable()` — release table on completion
- `listCourses()` — course status for KDS

## Design Decisions

1. **Single file preserved** — The service is logically well-organized with clear
   region markers. Splitting now would create circular dependencies (completion
   needs queries, modifications need recompute, creation needs commission).

2. **Transaction boundaries** — `complete()` and `refund()` use serializable
   isolation with retry logic. All other methods use auto-commit.

3. **Event emission** — Side effects (KDS, analytics, realtime) are fire-and-forget
   via EventEmitter2. Never block the money path.

4. **Idempotency** — In-memory cache (60s TTL) prevents double-orders from rapid
   POS taps. Cleaned every 5min. Bounded by TTL (cannot leak unbounded).

## Sprint 2 Refactoring Plan

When the team is ready to split:
1. Extract `OrderCompletionService` (highest isolation — only depends on inventory + finance)
2. Extract `OrderCreationService` (depends on promotions + pricing + combos)
3. Keep `SalesService` as facade + queries + modifications
4. Wire through `sales.module.ts` (add providers + inject into SalesService)
5. Controller remains unchanged (calls SalesService which delegates)
```
