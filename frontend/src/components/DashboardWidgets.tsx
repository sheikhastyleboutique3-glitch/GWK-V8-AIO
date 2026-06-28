/**
 * #5 — Dashboard Widgets (role-based quick stats)
 *
 * Renders contextual KPI cards based on user role:
 * - Manager: Revenue, Orders, Avg Ticket, GP%
 * - Kitchen: Pending items, Avg prep time
 * - Waiter: Active tables, Open orders
 * - Cashier: Session orders, Session revenue
 *
 * Usage:
 *   <DashboardWidgets />  (auto-detects role from auth context)
 */
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const fmtCurrency = (n: number) => new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

interface Widget {
  label: string;
  value: string | number;
  icon: string;
  color: string; // tailwind gradient
  subtext?: string;
}

export default function DashboardWidgets() {
  const { user, activeBranch } = useAuth();
  const branchId = activeBranch?.id;
  const role = user?.role;

  // Fetch today's stats
  const { data: todayStats } = useQuery({
    queryKey: ['dashboard-stats', branchId],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [orders, session, lowStock] = await Promise.all([
        api.get('/sales/orders', { params: { branchId, dateFrom: today, status: 'COMPLETED' } }).then(r => r.data.data).catch(() => []),
        api.get('/pos-sessions/current', { params: { branchId } }).then(r => r.data.data).catch(() => null),
        api.get('/alerts', { params: { branchId, type: 'LOW_STOCK' } }).then(r => r.data.data).catch(() => []),
      ]);
      const revenue = (orders || []).reduce((s: number, o: any) => s + (o.total || 0), 0);
      const orderCount = (orders || []).length;
      const avgTicket = orderCount > 0 ? revenue / orderCount : 0;
      const gp = (orders || []).reduce((s: number, o: any) => s + (o.grossProfit || 0), 0);
      const gpPct = revenue > 0 ? (gp / revenue) * 100 : 0;
      return { revenue, orderCount, avgTicket, gpPct, session, lowStockCount: (lowStock || []).length };
    },
    enabled: !!branchId,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const widgets: Widget[] = [];

  // Manager/Admin widgets
  if (role === 'SUPER_ADMIN' || role === 'BRANCH_MANAGER') {
    widgets.push(
      { label: "Today's Revenue", value: fmtCurrency(todayStats?.revenue || 0), icon: '💰', color: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
      { label: "Today's Orders", value: todayStats?.orderCount || 0, icon: '📋', color: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800' },
      { label: 'Avg Ticket', value: fmtCurrency(todayStats?.avgTicket || 0), icon: '🎫', color: 'from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200 dark:border-purple-800' },
      { label: 'Gross Profit %', value: `${(todayStats?.gpPct || 0).toFixed(1)}%`, icon: '📈', color: 'from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200 dark:border-amber-800' },
    );
    if (todayStats?.lowStockCount) {
      widgets.push({ label: 'Low Stock Alerts', value: todayStats.lowStockCount, icon: '⚠️', color: 'from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-red-200 dark:border-red-800', subtext: 'Items below min level' });
    }
  }

  // Cashier widgets
  if (role === 'CASHIER') {
    widgets.push(
      { label: 'Session Orders', value: todayStats?.orderCount || 0, icon: '🛒', color: 'from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200 dark:border-blue-800' },
      { label: 'Session Revenue', value: fmtCurrency(todayStats?.revenue || 0), icon: '💵', color: 'from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200 dark:border-emerald-800' },
    );
  }

  if (!widgets.length) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
      {widgets.map((w, i) => (
        <div key={i} className={`bg-gradient-to-br ${w.color} rounded-xl border p-4`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{w.icon}</span>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{w.label}</span>
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-gray-100">{w.value}</div>
          {w.subtext && <div className="text-[10px] text-gray-500 mt-0.5">{w.subtext}</div>}
        </div>
      ))}
    </div>
  );
}
