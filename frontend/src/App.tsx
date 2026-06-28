import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './contexts/AuthContext';
import api from './lib/api';
import { applyTheme, saveThemeLocal, themeFromSettings } from './lib/theme';
import CommandPalette from './components/CommandPalette';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RequisitionsPage from './pages/RequisitionsPage';
import NewRequisitionPage from './pages/NewRequisitionPage';
import RequisitionDetailPage from './pages/RequisitionDetailPage';
import CatalogPage from './pages/CatalogPage';
import InventoryPage from './pages/InventoryPage';
import WastagePage from './pages/WastagePage';
import SuppliersPage from './pages/SuppliersPage';
import PurchaseOrdersPage from './pages/PurchaseOrdersPage';
import TransfersPage from './pages/TransfersPage';
import BranchesPage from './pages/BranchesPage';
import UsersPage from './pages/UsersPage';
import PermissionsPage from './pages/PermissionsPage';
import CategoriesPage from './pages/CategoriesPage';
import SettingsPage from './pages/SettingsPage';
import AlertsPage from './pages/AlertsPage';
import AdminPage from './pages/AdminPage';
import ReportsPage from './pages/ReportsPage';
import PricingPage from './pages/PricingPage';
import AuditLogPage from './pages/AuditLogPage';
import NotificationsPage from './pages/NotificationsPage';
import UnitsPage from './pages/UnitsPage';
import PosDashboardPage from './pages/PosDashboardPage';
import CustomerDisplayPage from './pages/CustomerDisplayPage';
import TablePayPage from './pages/TablePayPage';
import ReservationWidgetPage from './pages/ReservationWidgetPage';
import DigitalMenuPage from './pages/DigitalMenuPage';
import POSPage from './pages/POSPage';
import KDSPage from './pages/KDSPage';
import SalesDashboardPage from './pages/SalesDashboardPage';
import ProductionPage from './pages/ProductionPage';
import TablesPage from './pages/TablesPage';
import BookingsPage from './pages/BookingsPage';
import PromotionsPage from './pages/PromotionsPage';
import RecipesPage from './pages/RecipesPage';
import ModifiersPage from './pages/ModifiersPage';
import StaffTasksPage from './pages/StaffTasksPage';
import StaffPerformancePage from './pages/StaffPerformancePage';
import WaiterPage from './pages/WaiterPage';
import DeliveriesPage from './pages/DeliveriesPage';
import SalesOrdersPage from './pages/SalesOrdersPage';
import CustomersPage from './pages/CustomersPage';
import StockCountPage from './pages/StockCountPage';
import MenuPage from './pages/MenuPage';
import ReceivablesPage from './pages/ReceivablesPage';
import PayablesPage from './pages/PayablesPage';
import DeliveryPlatformsPage from './pages/DeliveryPlatformsPage';
import DiscountRulesPage from './pages/DiscountRulesPage';
import PrintersPage from './pages/PrintersPage';
import LoyaltyPage from './pages/LoyaltyPage';
import OrderPresetsPage from './pages/OrderPresetsPage';
import PaymentMethodsPage from './pages/PaymentMethodsPage';
import PaymentTerminalsPage from './pages/PaymentTerminalsPage';
import CashRoundingsPage from './pages/CashRoundingsPage';
import FiscalPositionsPage from './pages/FiscalPositionsPage';
import IotDevicesPage from './pages/IotDevicesPage';
import SelfOrderConfigsPage from './pages/SelfOrderConfigsPage';
import ProductAttributesPage from './pages/ProductAttributesPage';
import CombosPage from './pages/CombosPage';
import PricelistsPage from './pages/PricelistsPage';
import KioskPage from './pages/KioskPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import SessionsPage from './pages/SessionsPage';
import PosReportsPage from './pages/PosReportsPage';
import LoadingSpinner from './components/LoadingSpinner';

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
    <>
    <CommandPalette />
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/kiosk/:configId" element={<KioskPage />} />
      <Route path="/customer-display" element={<CustomerDisplayPage />} />
      <Route path="/pay/:orderId" element={<TablePayPage />} />
      <Route path="/book" element={<ReservationWidgetPage />} />
      <Route path="/menu/:branchId" element={<DigitalMenuPage />} />
      {/* Full-screen POS & Waiter — no sidebar */}
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
        <Route index element={<DashboardPage />} />
        <Route path="requisitions" element={<RequisitionsPage />} />
        <Route path="requisitions/new" element={<NewRequisitionPage />} />
        <Route path="requisitions/:id" element={<RequisitionDetailPage />} />
        <Route path="catalog" element={<CatalogPage />} />
        <Route path="wastage" element={<WastagePage />} />
        <Route path="alerts" element={<AlertsPage />} />

        {/* Restaurant POS / Kitchen / Sales — front-of-house */}
        <Route
          path="pos-dashboard"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER']}>
              <PosDashboardPage />
            </ProtectedRoute>
          }
        />
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
        <Route
          path="staff-performance"
          element={
            <ProtectedRoute roles={['SUPER_ADMIN', 'BRANCH_MANAGER']}>
              <StaffPerformancePage />
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
    </>
  );
}
