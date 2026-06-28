import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DashboardPage from '../pages/DashboardPage';

/**
 * Role-based landing: redirects operational staff to their primary workspace
 * instead of the management dashboard. Management roles see the dashboard.
 *
 * - CASHIER → /pos
 * - WAITER → /waiter
 * - KITCHEN, PASTRY, BARISTA → /kds
 * - DRIVER → /deliveries
 * - WAREHOUSE → /inventory
 * - CLEANER → /staff-tasks
 * - PROCUREMENT → /requisitions
 * - Everyone else (SUPER_ADMIN, BRANCH_MANAGER) → Dashboard
 */
export default function RoleLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const role = user.role;

    const redirectMap: Record<string, string> = {
      CASHIER: '/pos',
      WAITER: '/waiter',
      KITCHEN: '/kds',
      PASTRY: '/kds',
      BARISTA: '/kds',
      DRIVER: '/deliveries',
      WAREHOUSE: '/inventory',
      CLEANER: '/staff-tasks',
      PROCUREMENT: '/requisitions',
    };

    const target = redirectMap[role];
    if (target) {
      navigate(target, { replace: true });
    }
  }, [user, navigate]);

  // Management roles see the dashboard
  return <DashboardPage />;
}
