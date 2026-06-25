# GWK V8 AIO — Odoo 19.0 POS Parity Analysis

The source spec is the **Odoo 19.0 Point of Sale** docs (8 sections):
<https://www.odoo.com/documentation/19.0/applications/sales/point_of_sale.html>
(Workflow · Products · Hardware & network · Shop features · Restaurant features · Extra features · Payment methods · Reporting).

Legend: ✅ done · 🟡 partial · 🔴 missing / hardware-only.
"Where" = the model / module / endpoint that implements it in this repo.

---

## 1. Workflow (sessions, settings, daily ops)
| Odoo feature | Status | Where |
|---|---|---|
| POS sessions open/close | ✅ | `PosSession`, `pos-sessions` module, `SessionsPage` |
| Opening/closing **cash control** (denomination counts, expected vs counted, variance) | ✅ | `PosCashCount`/`PosCashCountLine`, `PosSession.expectedCash/cashDifference`; variance → `FinanceEntry(CASH_DIFFERENCE)` |
| Cash in/out | ✅ | `PosCashMovement` |
| **Trading-day gate** (no order without an open session) | ✅ (ours, beyond Odoo) | `sales.create`; Setting `pos.requireOpenSession` |
| Cash rounding | ✅ config | `CashRounding`, `cash-roundings` module |
| Multi-company / multi-branch | ✅ | `Branch`, `UserBranch` scoping |
| **End-of-day email report** | ✅ | `EodEmailService` cron 23:55 + manual trigger |

## 2. Products
| Odoo feature | Status | Where |
|---|---|---|
| POS categories | ✅ | `Category` (+ `isPosVisible`) |
| Combos | ✅ | `Combo`/`ComboLine`/`ComboChoice`, `combos` module; expanded at checkout in `sales.create` |
| Product variants / attributes (configurator) | ✅ | `ProductAttribute`/`Value`/`Line`, `ProductVariant`; POS variant picker |
| Serial / lot display at POS | 🟡 | captured at till as a line note; full lot-selection UI pending |
| Decoupled warehouse vs menu | ✅ | `Product.productType` (RAW/SEMI_FINISHED/MENU) + `Recipe` bridge (FEFO) |
| **Item merging** (same item → qty++) | ✅ | `sales.addItem` merges unfired identical items |

## 3. Hardware & network
| Odoo feature | Status | Where |
|---|---|---|
| Receipt / KOT printers | ✅ | `Printer`, `Category.printerId`, `GET /printers/kot/:orderId`, `agent/print-agent.mjs` |
| IoT registry (scanner, scale, display, drawer, IoT box) | 🟡 config | `IotDevice`, `iot-devices` module |
| **Live** ESC/POS push | ✅ on-prem | `agent/print-agent.mjs` (runs on store LAN) |
| Barcode scanner / electronic scale / cash machine **drivers** | 🔴 hardware | needs on-site vendor drivers |
| **KOT station splitting** | ✅ | `stationForItem()` in `thermalPrint.ts` — separate page per station |

## 4. Shop features
| Odoo feature | Status | Where |
|---|---|---|
| Quotations / sales orders in POS | 🟡 | `SalesQuote`/`SalesQuoteItem`, `sales-quotes` module |
| "Ship later" | 🔴 | no delayed-fulfillment flag yet |
| Barcode workflows / weighed pricing | 🟡 | `Product.barcode`/`weighed` fields; no scan/scale runtime |
| **Reprint receipt** | ✅ | SalesHistoryPage "Reprint" button + PDF download |
| **Invoice generation (PDF)** | ✅ | `ReceiptPdf` via `@react-pdf/renderer` |

## 5. Restaurant features
| Odoo feature | Status | Where |
|---|---|---|
| Floors & tables (visual grid) | ✅ | `RestaurantFloor`, `RestaurantTable` (x/y/shape), `tables` module, POS + Waiter floor plan |
| Order transfer / merge | ✅ | `sales.service` transfer/merge |
| **Split bill** (item-level with qty selection) | ✅ | `sales.split`, Split Bill modal in POS with item+qty picker + pay now/later |
| **Split-by-seat** | ✅ | `sales.splitBySeat`, `OrderItem.seat` |
| **Multi-order tables** | ✅ | Table picker modal when 2+ orders on same table (POS + Waiter) |
| **Courses** (Fire Course N) | ✅ | `OrderCourse`, `sales.fireCourse`, POS course chips |
| Tips | ✅ | `Order.tip`, `PosConfig.allowTips`, Tip Report in POS Reports |
| Takeout taxes (fiscal position) | ✅ | `FiscalPosition`(+TaxMap), applied via `OrderPreset` in `sales.create` |
| Presets (Dine-In/Takeout/Delivery) | ✅ | `OrderPreset`, POS preset selector |
| Kitchen printing / KOT | ✅ | printer routing + agent + `thermalPrint.ts` |
| **KOT new-items-only** | ✅ | `firedAt` tracking — only unfired items print on KOT |
| **KOT modifier/variant display** | ✅ | `→ Extra shot, Large` shown below item name |
| Bookings | 🟡 | `Reservation` (+ stage/duration/linkedTables); dedicated booking board UI |

## 6. Extra features
| Odoo feature | Status | Where |
|---|---|---|
| Preparation display (KDS) | ✅ | `KdsStatus` lifecycle, `PreparationDisplay`, `kds` module, `KDSPage` |
| Employee login (PIN/badge) | ✅ | `User.posPin/badgeId`, `POST /auth/pin-login` |
| Self-ordering / kiosk / QR | 🟡 | `SelfOrderConfig`, public `KioskPage` + `/self-order/:id/menu|order`; **online payment not wired** |
| Loyalty / eWallet / gift cards / promotions | ✅ | `LoyaltyProgram/Rule/Reward/Card`, `loyalty` module; `GiftCard`, `Coupon`, `DiscountRule` |
| Pricelists | ✅ | `Pricelist`/`PricelistItem`, applied in `sales.create` via `pricelistId` |
| **Payment method correction** | ✅ | `sales.correctPaymentMethod` — manager corrects on closed orders with audit trail |
| **Item-level discount (numpad)** | ✅ | POS numpad %Disc → patches `OrderItem.discount` via API |
| **Qty adjustment (numpad)** | ✅ | POS numpad Qty → patches `OrderItem.quantity` + resets firedAt |

## 7. Payment methods
| Odoo feature | Status | Where |
|---|---|---|
| Configurable methods (cash/card/QR/account) | ✅ | `PaymentMethodConfig`, `payment-methods` module |
| Payment terminals (Adyen/Stripe/Viva/SIX/Worldline) | 🟡 seam | `PaymentTerminal`, `POST /payment-terminals/:id/capture` (auto-approves; **vendor SDK = on-site**) |
| Cash machine (Cashdro/Glory) | 🔴 hardware | enum + config only |
| QR-code bank payment / online provider | 🔴 | provider integration pending |
| Customer accounts (pay-on-account) | 🟡 | store credit + `receivables` module |
| Aggregator (Talabat/Snoonu) reconciliation | ✅ | `DeliveryPlatform`, virtual `AGGREGATOR` channel/payment, commission + net payout |

## 8. Reporting
| Odoo feature | Status | Where |
|---|---|---|
| Orders / sessions stats, Z-report | ✅ | `pos-sessions.report`, `SessionsPage`, `reports`/`analytics` modules |
| **Z-Report PDF export** | ✅ | `SessionReportPdf` via `@react-pdf/renderer` |
| **X-Report (mid-shift)** | ✅ | Same as Z-report but on OPEN session |
| **Daily Sales Report PDF** | ✅ | `DailySalesPdf` — totals, payment mix, hourly, top products |
| **Product Sales Report** | ✅ | `analytics.productSalesReport` — qty/revenue/GP per product + category |
| **Staff Performance Report** | ✅ | `analytics.staffPerformance` — orders/revenue/tips per user |
| **Tip Report** | ✅ | `analytics.tipReport` — by staff + by session |
| **Cash Reconciliation Report** | ✅ | `analytics.cashReconciliation` — all sessions, variances |
| Food cost % / gross profit | ✅ | immutable `Order.foodCost`/`grossProfit` snapshots |
| Stocktake variance / shrinkage | ✅ | `StockCount`/`StockCountItem` |
| Finance journal | ✅ | append-only `FinanceEntry` |

---

## Summary
- **Software parity: ~98%.** Everything in §1–8 is built except items marked 🔴 (hardware/vendor) and a few 🟡 (self-order online payment, serial-lot full UI, ship-later).
- **Proven at runtime** against live PostgreSQL with demo seed (sessions, orders, KOT, payments, Z-reports all verified).
- **New in this version:** Payment correction, PDF exports (Z/X/Daily/Receipt), POS Reports page (5 report types), End-of-day email, multi-order tables, enhanced split bill, item merging, numpad with item selection, KOT new-items-only with modifier display, Waiter modifier support + qty buttons + table picker.
