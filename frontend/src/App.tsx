import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './contexts/AuthContext';
import api from './lib/api';
import { applyTheme, saveThemeLocal, themeFromSettings } from './lib/theme';

/**
 * Lazy import with retry — if a chunk fails to load (stale hash after deploy),
 * forces a page refresh to get the new index.html with updated chunk references.
 */
function lazyRetry(importFn: () => Promise<{ default: React.ComponentType<any> }>) {
  return lazy(() => importFn().catch((err) => {
    const hasReloaded = sessionStorage.getItem('chunk_reload');
    if (!hasReloaded) {
      sessionStorage.setItem('chunk_reload', '1');
      window.location.reload();
    }
    sessionStorage.removeItem('chunk_reload');
    throw err;
  }));
}
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RoleLanding from './components/RoleLanding';
import LoadingSpinner from './components/LoadingSpinner';

// ── Lazy-loaded pages (code-split into separate chunks) ─────────────────────
// Heavy front-of-house pages
const POSPage = lazyRetry(() => import('./pages/POSPage'));
const WaiterPage = lazyRetry(() => import('./pages/WaiterPage'));
const KDSPage = lazyRetry(() => import('./pages/KDSPage'));
const KioskPage = lazyRetry(() => import('./pages/KioskPage'));
const PublicMenuPage = lazyRetry(() => import('./pages/PublicMenuPage'));
const CustomerDisplayPage = lazyRetry(() => import('./pages/CustomerDisplayPage'));

// Sales & Analytics
const SalesDashboardPage = lazyRetry(() => import('./pages/SalesDashboardPage'));
const SalesHistoryPage = lazyRetry(() => import('./pages/SalesHistoryPage'));
const SalesOrdersPage = lazyRetry(() => import('./pages/SalesOrdersPage'));
const PosReportsPage = lazyRetry(() => import('./pages/PosReportsPage'));
const SessionsPage = lazyRetry(() => import('./pages/SessionsPage'));
const ReturnWithoutReceiptPage = lazyRetry(() => import('./pages/ReturnWithoutReceiptPage'));

// Inventory & Supply Chain
const InventoryPage = lazyRetry(() => import('./pages/InventoryPage'));
const RequisitionsPage = lazyRetry(() => import('./pages/RequisitionsPage'));
const NewRequisitionPage = lazyRetry(() => import('./pages/NewRequisitionPage'));
const RequisitionDetailPage = lazyRetry(() => import('./pages/RequisitionDetailPage'));
const WastagePage = lazyRetry(() => import('./pages/WastagePage'));
const WarehouseCatalogPage = lazyRetry(() => import('./pages/WarehouseCatalogPage'));
const SuppliersPage = lazyRetry(() => import('./pages/SuppliersPage'));
const PurchaseOrdersPage = lazyRetry(() => import('./pages/PurchaseOrdersPage'));
const TransfersPage = lazyRetry(() => import('./pages/TransfersPage'));
const StockCountPage = lazyRetry(() => import('./pages/StockCountPage'));
const ProductionPage = lazyRetry(() => import('./pages/ProductionPage'));

// Menu & Pricing
const MenuPage = lazyRetry(() => import('./pages/MenuPage'));
const CategoriesPage = lazyRetry(() => import('./pages/CategoriesPage'));
const RecipesPage = lazyRetry(() => import('./pages/RecipesPage'));
const ModifiersPage = lazyRetry(() => import('./pages/ModifiersPage'));
const PromotionsPage = lazyRetry(() => import('./pages/PromotionsPage'));
const PricingPage = lazyRetry(() => import('./pages/PricingPage'));

// Team & Operations
const StaffTasksPage = lazyRetry(() => import('./pages/StaffTasksPage'));
const UsersPage = lazyRetry(() => import('./pages/UsersPage'));
const PermissionsPage = lazyRetry(() => import('./pages/PermissionsPage'));
const DeliveriesPage = lazyRetry(() => import('./pages/DeliveriesPage'));
const CustomersPage = lazyRetry(() => import('./pages/CustomersPage'));
const BookingsPage = lazyRetry(() => import('./pages/BookingsPage'));
const TablesPage = lazyRetry(() => import('./pages/TablesPage'));

// Finance & Insights
const ReportsPage = lazyRetry(() => import('./pages/ReportsPage'));
const AdvancedAnalyticsPage = lazyRetry(() => import('./pages/AdvancedAnalyticsPage'));
const ReceivablesPage = lazyRetry(() => import('./pages/ReceivablesPage'));
const PayablesPage = lazyRetry(() => import('./pages/PayablesPage'));
const AlertsPage = lazyRetry(() => import('./pages/AlertsPage'));
const NotificationsPage = lazyRetry(() => import('./pages/NotificationsPage'));
const AuditLogPage = lazyRetry(() => import('./pages/AuditLogPage'));

// Configuration & Admin
const BranchesPage = lazyRetry(() => import('./pages/BranchesPage'));
const SettingsPage = lazyRetry(() => import('./pages/SettingsPage'));
const AdminPage = lazyRetry(() => import('./pages/AdminPage'));
const UnitsPage = lazyRetry(() => import('./pages/UnitsPage'));
const PrintersPage = lazyRetry(() => import('./pages/PrintersPage'));
const DiscountRulesPage = lazyRetry(() => import('./pages/DiscountRulesPage'));
const DeliveryPlatformsPage = lazyRetry(() => import('./pages/DeliveryPlatformsPage'));
const LoyaltyPage = lazyRetry(() => import('./pages/LoyaltyPage'));
const OrderPresetsPage = lazyRetry(() => import('./pages/OrderPresetsPage'));
const PaymentMethodsPage = lazyRetry(() => import('./pages/PaymentMethodsPage'));
const PaymentTerminalsPage = lazyRetry(() => import('./pages/PaymentTerminalsPage'));
const CashRoundingsPage = lazyRetry(() => import('./pages/CashRoundingsPage'));
const FiscalPositionsPage = lazyRetry(() => import('./pages/FiscalPositionsPage'));
const IotDevicesPage = lazyRetry(() => import('./pages/IotDevicesPage'));
const SelfOrderConfigsPage = lazyRetry(() => import('./pages/SelfOrderConfigsPage'));
const QrCodesPage = lazyRetry(() => import('./pages/QrCodesPage'));
const ProductAttributesPage = lazyRetry(() => import('./pages/ProductAttributesPage'));
const CombosPage = lazyRetry(() => import('./pages/CombosPage'));
const PricelistsPage = lazyRetry(() => import('./pages/PricelistsPage'));
const StaffPerformancePage = lazyRetry(() => import('./pages/StaffPerformancePage'));
const DigitalMenuPage = lazyRetry(() => import('./pages/DigitalMenuPage'));
const PosDashboardPage = lazyRetry(() => import('./pages/PosDashboardPage'));
const ReservationWidgetPage = lazyRetry(() => import('./pages/ReservationWidgetPage'));
const TablePayPage = lazyRetry(() => import('./pages/TablePayPage'));

type Role = string;

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: Role[] }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <LoadingSpinner />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const ADMIN_ROLES = ['SUPER_ADMIN'];
const MANAGER_ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER'];
const OPS_ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT', 'WAREHOUSE'];
const PROCUREMENT_ROLES = ['SUPER_ADMIN', 'PROCUREMENT', 'WAREHOUSE'];
const REPORT_ROLES = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT'];

/**
 * Loads the saved theme from the backend Settings (group `branding`) once the
 * user is authenticated and applies it app-wide. localStorage gave us the
 * instant paint; this keeps the theme in sync across devices/sessions.
 */
function useSyncTheme() {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ['settings', 'branding'],
    queryFn: () => api.get('/settings', { params: { group: 'branding' } }).then(r => r.data.data),
    enabled: !!user,
    
  });
  useEffect(() => {
    if (!data) return;
    const map: Record<string, string> = {};
    data.forEach((s: any) => { map[s.key] = s.value; });
    const theme = themeFromSettings(map);
    applyTheme(theme);
    saveThemeLocal(theme);
  }, [data]);
}

export default function App() {
  useSyncTheme();
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><LoadingSpinner /></div>}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/kiosk/:configId" element={<KioskPage />} />
      <Route path="/order/:branchId" element={<PublicMenuPage />} />
      <Route path="/display/:branchId" element={<CustomerDisplayPage />} />
      {/* Public pages (no auth required) */}
      <Route path="/menu/:branchId" element={<DigitalMenuPage />} />
      <Route path="/book" element={<ReservationWidgetPage />} />
      <Route path="/pay/:orderId" element={<TablePayPage />} />

      {/* ── Full-screen workspaces (Odoo-style: no sidebar, no top bar) ── */}
      <Route
        path="/pos"
        element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
            <POSPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/waiter"
        element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER']}>
            <WaiterPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/kds"
        element={
          <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'KITCHEN', 'PASTRY', 'BARISTA']}>
            <KDSPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        {/* Open to all authenticated users */}
        <Route index element={<RoleLanding />} />
        <Route path="requisitions" element={<RequisitionsPage />} />
        <Route path="requisitions/new" element={<NewRequisitionPage />} />
        <Route path="requisitions/:id" element={<RequisitionDetailPage />} />
        <Route path="catalog" element={<WarehouseCatalogPage />} />
        <Route path="wastage" element={<WastagePage />} />
        <Route path="alerts" element={<AlertsPage />} />

        {/* Restaurant POS / Kitchen / Sales — front-of-house (full-screen routes above) */}
        <Route
          path="sales-dashboard"
          element={
            <ProtectedRoute roles={MANAGER_ROLES}>
              <SalesDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="production"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'KITCHEN', 'PASTRY', 'WAREHOUSE']}>
              <ProductionPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="tables"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER']}>
              <TablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="bookings"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER']}>
              <BookingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="deliveries"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'DRIVER']}>
              <DeliveriesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sales-orders"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <SalesOrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
              <CustomersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="stock-count"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'WAREHOUSE']}>
              <StockCountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sales-history"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
              <SalesHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="returns"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <ReturnWithoutReceiptPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff-performance"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <StaffPerformancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos-dashboard"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
              <PosDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="menu"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'BARISTA', 'PASTRY']}>
              <MenuPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="sessions"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
              <SessionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="pos-reports"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <PosReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="receivables"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT', 'CASHIER']}>
              <ReceivablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payables"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT']}>
              <PayablesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="delivery-platforms"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT']}>
              <DeliveryPlatformsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="discount-rules"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <DiscountRulesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="printers"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <PrintersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="loyalty"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
              <LoyaltyPage />
            </ProtectedRoute>
          }
        />
        {[
          { path: 'order-presets', el: <OrderPresetsPage /> },
          { path: 'payment-methods', el: <PaymentMethodsPage /> },
          { path: 'payment-terminals', el: <PaymentTerminalsPage /> },
          { path: 'cash-roundings', el: <CashRoundingsPage /> },
          { path: 'fiscal-positions', el: <FiscalPositionsPage /> },
          { path: 'iot-devices', el: <IotDevicesPage /> },
          { path: 'self-order', el: <SelfOrderConfigsPage /> },
          { path: 'product-attributes', el: <ProductAttributesPage /> },
          { path: 'combos', el: <CombosPage /> },
          { path: 'pricelists', el: <PricelistsPage /> },
          { path: 'qr-codes', el: <QrCodesPage /> },
        ].map((r) => (
          <Route
            key={r.path}
            path={r.path}
            element={<ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>{r.el}</ProtectedRoute>}
          />
        ))}
        <Route
          path="promotions"
          element={
            <ProtectedRoute roles={MANAGER_ROLES}>
              <PromotionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="recipes"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'KITCHEN', 'PASTRY']}>
              <RecipesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="modifiers"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <ModifiersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="staff-tasks"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CLEANER', 'WAREHOUSE']}>
              <StaffTasksPage />
            </ProtectedRoute>
          }
        />

        {/* Inventory — ops roles */}
        <Route
          path="inventory"
          element={
            <ProtectedRoute roles={OPS_ROLES}>
              <InventoryPage />
            </ProtectedRoute>
          }
        />

        {/* Branch Transfers — ops roles */}
        <Route
          path="transfers"
          element={
            <ProtectedRoute roles={OPS_ROLES}>
              <TransfersPage />
            </ProtectedRoute>
          }
        />

        {/* Suppliers — procurement roles */}
        <Route
          path="suppliers"
          element={
            <ProtectedRoute roles={PROCUREMENT_ROLES}>
              <SuppliersPage />
            </ProtectedRoute>
          }
        />

        {/* Purchase Orders — procurement roles */}
        <Route
          path="purchase-orders"
          element={
            <ProtectedRoute roles={PROCUREMENT_ROLES}>
              <PurchaseOrdersPage />
            </ProtectedRoute>
          }
        />

        {/* Reports — report roles */}
        <Route
          path="reports"
          element={
            <ProtectedRoute roles={REPORT_ROLES}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="advanced-analytics"
          element={
            <ProtectedRoute roles={MANAGER_ROLES}>
              <AdvancedAnalyticsPage />
            </ProtectedRoute>
          }
        />

        {/* Pricing — procurement + admin */}
        <Route
          path="pricing"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'PROCUREMENT']}>
              <PricingPage />
            </ProtectedRoute>
          }
        />

        {/* Branches — super admin only */}
        <Route
          path="branches"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <BranchesPage />
            </ProtectedRoute>
          }
        />

        {/* Users — manager+ */}
        <Route
          path="users"
          element={
            <ProtectedRoute roles={MANAGER_ROLES}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="permissions"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN']}>
              <PermissionsPage />
            </ProtectedRoute>
          }
        />

        {/* Categories — manager+ */}
        <Route
          path="categories"
          element={
            <ProtectedRoute roles={MANAGER_ROLES}>
              <CategoriesPage />
            </ProtectedRoute>
          }
        />

        {/* Units — super admin only */}
        <Route
          path="units"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <UnitsPage />
            </ProtectedRoute>
          }
        />

        {/* Settings — super admin only */}
        <Route
          path="settings"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* Notifications — all authenticated (preferences) */}
        <Route path="notifications" element={<NotificationsPage />} />

        {/* Audit Log — super admin only */}
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AuditLogPage />
            </ProtectedRoute>
          }
        />

        {/* Admin panel — super admin only */}
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={ADMIN_ROLES}>
              <AdminPage />
            </ProtectedRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
