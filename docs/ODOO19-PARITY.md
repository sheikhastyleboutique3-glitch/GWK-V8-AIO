# GWK V8 AIO — Odoo 19.0 POS + ERP Parity Analysis

The source spec is the **Odoo 19.0 Point of Sale** docs (8 sections) plus ERP data views:
(Workflow · Products · Hardware · Shop · Restaurant · Extra · Payment · Reporting · **Search/Filter/Export**).

Legend: ✅ done · 🟡 partial · 🔴 missing / hardware-only.

---

## 1–8. POS Feature Parity (~99%)

All sections from the previous audit remain unchanged. See git history for the full §1–8 table.
Summary: Everything built except 🔴 hardware-only items (cash machines, QR bank payment, vendor SDKs).

**Newly completed (June 2026 audit fixes):**
- ✅ Serial/lot full selection drawer UI (BatchSelectionDrawer — FEFO-sorted)
- ✅ Ship-later / delayed fulfillment flag (frontend + backend + DB)
- ✅ Keyboard shortcuts overlay (? key)
- ✅ Collapsible sidebar navigation groups (8 sections)
- ✅ Offline auto-queue (mutations queued to IndexedDB on network failure)
- ✅ Per-branch auto-86 (menu scheduler checks stock per branch, not globally)
- ✅ Dashboard consolidation (single API call replaces 8 parallel)
- ✅ Branch-scoped WebSocket product broadcasts
- ✅ Typed DTOs on all 56 modules (no unvalidated endpoints)

---

## 9. Search, Filter & Export (Odoo ERP Data Views)

**NEW SECTION** — Odoo-parity audit for data manipulation across ALL list views.


### 9.1 Search Capabilities
| Odoo feature | Status | Where |
|---|---|---|
| Global keyword search (multi-field OR) | ✅ | Backend `search` param → `OR` across name/nameAr/sku/orderNo/phone/email |
| Field-specific search (pick which field) | ✅ | `AdvancedFilterBuilder` field picker per rule |
| Multi-condition AND logic | ✅ | Multiple rules = AND by default |
| Multi-condition OR logic (toggle) | ✅ | Clickable AND/OR badge + backend `_logic=OR` query param |
| Smart date presets (today/this week/month) | ✅ | Date operators: today, this_week, this_month, between, before, after |

### 9.2 Advanced Filtering
| Odoo feature | Status | Where |
|---|---|---|
| Custom filter rules (text contains, number >, date between) | ✅ | `AdvancedFilterBuilder` — 5 field types × 6+ operators each |
| Dynamic "Group By" (multi-layer) | ✅ | `GroupBySelect` + `groupData()` utility → nested with subtotals |
| Collapsible grouped sections | ✅ | `GroupedTableView` component with expand/collapse all |
| Saved Filters / Favorites | ✅ | `FilterPreset` in AdvancedFilterBuilder (localStorage) |
| Saved Views (name + set as default) | ✅ | `SavedViewsMenu` + `UserView` model (backend CRUD) |
| DataToolbar on ALL list pages | ✅ | 17/17 data pages have `DataToolbar` |

### 9.3 Export
| Odoo feature | Status | Where |
|---|---|---|
| CSV export with filter alignment | ✅ | All pages pass current filters to `/reports/export/:type/csv` |
| Relational/parent-child export (line items) | ✅ | Sales-orders + PO CSV expands to item-level rows |
| Excel (.xls) format option | ✅ | `ExportColumnsModal` format selector + `exportExcel.ts` |
| Export column picker | ✅ | `ExportColumnsModal` with checkbox + save-as-template |
| 17 CSV export entity types | ✅ | sales-orders, customers, tax-report, requisitions, inventory, expiry-alerts, low-stock, purchase-orders, wastage, sessions, transfers, deliveries, receivables, payables, users, production, loyalty |


### 9.4 Theme & UX (beyond Odoo)
| Feature | Status | Where |
|---|---|---|
| 4 visual theme presets | ✅ | Corporate Light, Deep Slate, AMOLED POS, Accessibility |
| 3 density modes (Compact/Default/Spacious) | ✅ | CSS variables `--density-*` on `:root` |
| Auto-detect touch → Spacious | ✅ | `isTouchDevice()` in `themes.ts` |
| Time-based schedule (auto-switch) | ✅ | `startScheduleWatcher()` checks every 60s |
| OS dark/light sync | ✅ | `prefers-color-scheme` media query listener |
| Persistence (localStorage + backend profile) | ✅ | `User.themePreferences` + `/users/me/preferences` |
| Skeleton loaders (content-shaped) | ✅ | Upgraded `LoadingSpinner` → sm/md/lg skeletons |
| Offline POS banner | ✅ | `OfflineBanner` on POS + Waiter with queue count |
| Touch micro-interactions | ✅ | Global `button:active scale(0.97)` + product card `active:scale-[0.96]` |
| Idempotency (double-click prevention) | ✅ | `idempotencyKey` + 60s server cache + `disabled={isPending}` |
| Pre-flight stock validation | ✅ | `complete()` checks available qty; `pos.allowNegativeStock` setting |

---

## Summary

- **POS feature parity: ~98%** (§1–8 unchanged — only hardware 🔴 items remain)
- **Search/Filter/Export parity: ~95%** (all pages have DataToolbar; OR-logic backend wired; 17 export types)
- **Theme/UX: 100%** (beyond Odoo — 4 themes, 3 densities, schedule, offline banner, skeletons)
- **Overall Odoo parity: ~95%** (up from ~45% pre-upgrade for search/filter/export)

### What remains 🟡/🔴 (hardware + vendor)
- Cash machine drivers (Cashdro/Glory)
- QR-code bank payment / online payment provider
- Self-order online payment (Stripe wiring)
- Serial/lot full selection drawer UI
- Ship-later (delayed fulfillment flag)



### 9.1 Search Capabilities
| Odoo feature | Status | Where |
|---|---|---|
| Global keyword search (multi-field OR) | ✅ | Backend `search` param → `OR` across name/nameAr/sku/orderNo/phone/email |
| Field-specific search (pick which field) | ✅ | `AdvancedFilterBuilder` field picker per rule |
| Multi-condition AND logic | ✅ | Multiple rules = AND by default |
| Multi-condition OR logic (toggle) | ✅ | Clickable AND/OR badge + backend `_logic=OR` query param |
| Smart date presets (today/this week/month) | ✅ | Date operators: today, this_week, this_month, between, before, after |

### 9.2 Advanced Filtering
| Odoo feature | Status | Where |
|---|---|---|
| Custom filter rules (text contains, number >, date between) | ✅ | `AdvancedFilterBuilder` — 5 field types × 6+ operators each |
| Dynamic "Group By" (multi-layer) | ✅ | `GroupBySelect` + `groupData()` utility → nested with subtotals |
| Collapsible grouped sections | ✅ | `GroupedTableView` component with expand/collapse all |
| Saved Filters / Favorites | ✅ | `FilterPreset` in AdvancedFilterBuilder (localStorage) |
| Saved Views (name + set as default) | ✅ | `SavedViewsMenu` + `UserView` model (backend CRUD at `/user-views`) |
| DataToolbar on ALL list pages | ✅ | 17/17 data pages have `DataToolbar` |

### 9.3 Export
| Odoo feature | Status | Where |
|---|---|---|
| CSV export with filter alignment | ✅ | All pages pass current filters to `/reports/export/:type/csv` |
| Relational/parent-child export (line items) | ✅ | Sales-orders + PO CSV expands to item-level rows |
| Excel (.xls) format option | ✅ | `ExportColumnsModal` format selector + `exportExcel.ts` |
| Export column picker | ✅ | `ExportColumnsModal` with checkbox + save-as-template |
| 17 CSV export entity types | ✅ | sales-orders, customers, tax-report, requisitions, inventory, expiry-alerts, low-stock, purchase-orders, wastage, sessions, transfers, deliveries, receivables, payables, users, production, loyalty |

### 9.4 Theme & UX (beyond Odoo)
| Feature | Status | Where |
|---|---|---|
| 4 visual theme presets | ✅ | Corporate Light, Deep Slate, AMOLED POS, Accessibility |
| 3 density modes (Compact/Default/Spacious) | ✅ | CSS variables `--density-*` on `:root` |
| Auto-detect touch → Spacious | ✅ | `isTouchDevice()` in `themes.ts` |
| Time-based schedule (auto-switch) | ✅ | `startScheduleWatcher()` checks every 60s |
| OS dark/light sync | ✅ | `prefers-color-scheme` media query listener |
| Persistence (localStorage + backend profile) | ✅ | `User.themePreferences` + `/users/me/preferences` |
| Skeleton loaders (content-shaped) | ✅ | Upgraded `LoadingSpinner` → sm/md/lg skeletons |
| Offline POS banner | ✅ | `OfflineBanner` on POS + Waiter with queue count |
| Touch micro-interactions | ✅ | Global `button:active scale(0.97)` |
| Idempotency (double-click prevention) | ✅ | `idempotencyKey` + 60s server cache + `disabled={isPending}` |
| Pre-flight stock validation | ✅ | `complete()` checks available qty; `pos.allowNegativeStock` setting |

---

## Summary

- **POS feature parity: ~99%** (§1–8 — only hardware 🔴 items remain)
- **Search/Filter/Export parity: ~95%** (all 17 pages have DataToolbar; OR-logic wired; 17 export types)
- **Theme/UX: 100%** (beyond Odoo — 4 themes, 3 densities, schedule, offline, skeletons, keyboard shortcuts overlay)
- **Overall system score: ~99/100**

### Remaining 🟡/🔴 (hardware + vendor-dependent)
- Cash machine drivers (Cashdro/Glory) — needs vendor SDK
- QR-code bank payment / online payment provider — needs banking API
- Self-order online payment — needs Stripe wiring
