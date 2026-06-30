import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';

/**
 * Reports & Analytics hub — ONE clear entry point for every dashboard / report
 * screen. These pages used to be scattered across the sidebar (and several had
 * routes but no nav entry at all), so staff couldn't find them. This hub groups
 * them and role-filters the cards. It does not replace any page — every card
 * just deep-links to the existing route.
 */

type Card = { to: string; labelKey: string; desc: string; icon: string; roles: string[] };

const SECTIONS: { heading: string; cards: Card[] }[] = [
  {
    heading: 'Dashboards',
    cards: [
      { to: '/sales-dashboard', labelKey: 'nav.salesDashboard', desc: 'Revenue, top products, trends', icon: '📈', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'] },
      { to: '/pos-dashboard', labelKey: 'nav.posDashboard', desc: 'Live POS activity & cashier view', icon: '🛍️', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'] },
    ],
  },
  {
    heading: 'Sales & Cash',
    cards: [
      { to: '/sales-history', labelKey: 'nav.salesHistory', desc: 'Completed orders & receipts', icon: '🧾', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'] },
      { to: '/sales-orders', labelKey: 'nav.salesOrders', desc: 'All orders by status', icon: '📋', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'] },
      { to: '/sessions', labelKey: 'nav.sessions', desc: 'Shift / cash declarations', icon: '💵', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'CASHIER'] },
    ],
  },
  {
    heading: 'Reports & Analytics',
    cards: [
      { to: '/reports', labelKey: 'nav.reports', desc: 'Sales, inventory & finance reports', icon: '📊', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT'] },
      { to: '/pos-reports', labelKey: 'nav.posReports', desc: 'X/Z reports & payment breakdown', icon: '🖨️', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'] },
      { to: '/advanced-analytics', labelKey: 'nav.advancedAnalytics', desc: 'Deep drill-down & comparisons', icon: '🔬', roles: ['SUPER_ADMIN', 'BRANCH_MANAGER'] },
    ],
  },
];

export default function ReportsHubPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const role = user?.role ?? '';
  const can = (roles: string[]) => roles.length === 0 || roles.includes(role);

  return (
    <div className="max-w-5xl">
      <PageHeader title={t('nav.reportsHub')} subtitle="All dashboards, reports and analytics in one place" />
      <div className="space-y-7">
        {SECTIONS.map((section) => {
          const cards = section.cards.filter((c) => can(c.roles));
          if (!cards.length) return null;
          return (
            <div key={section.heading}>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-fg-muted mb-2.5">{section.heading}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {cards.map((c) => (
                  <Link
                    key={c.to}
                    to={c.to}
                    className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 hover:border-primary hover:shadow-sm active:scale-[0.98] transition-all"
                  >
                    <span className="text-2xl leading-none">{c.icon}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-fg group-hover:text-primary truncate">{t(c.labelKey)}</span>
                      <span className="block text-xs text-fg-muted mt-0.5">{c.desc}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
