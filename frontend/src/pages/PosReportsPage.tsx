/**
 * POS Reports Page — Odoo 19 parity: Product Sales, Staff Performance,
 * Tip Report, Cash Reconciliation, and End-of-Day Email trigger.
 */
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'product-sales' | 'staff' | 'tips' | 'cash-recon';
const PERIODS = ['today', 'week', 'month'] as const;

export default function PosReportsPage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const branchId = activeBranch?.id;
  const [tab, setTab] = useState<Tab>('product-sales');
  const [period, setPeriod] = useState<string>('today');

  const params = { branchId: branchId || undefined, period };

  const { data: productSales, isLoading: psLoading } = useQuery({
    queryKey: ['pos-report-products', branchId, period],
    queryFn: () => api.get('/analytics/product-sales', { params }).then((r) => r.data.data),
    enabled: tab === 'product-sales',
  });

  const { data: staffPerf, isLoading: spLoading } = useQuery({
    queryKey: ['pos-report-staff', branchId, period],
    queryFn: () => api.get('/analytics/staff-performance', { params }).then((r) => r.data.data),
    enabled: tab === 'staff',
  });

  const { data: tipData, isLoading: tipLoading } = useQuery({
    queryKey: ['pos-report-tips', branchId, period],
    queryFn: () => api.get('/analytics/tip-report', { params }).then((r) => r.data.data),
    enabled: tab === 'tips',
  });

  const { data: cashRecon, isLoading: crLoading } = useQuery({
    queryKey: ['pos-report-cash', branchId, period],
    queryFn: () => api.get('/analytics/cash-reconciliation', { params: { branchId: branchId || undefined, from: period === 'today' ? new Date().toISOString().slice(0, 10) : undefined } }).then((r) => r.data.data),
    enabled: tab === 'cash-recon',
  });

  const sendEod = useMutation({
    mutationFn: () => api.post('/analytics/send-eod-email').then((r) => r.data.data),
    onSuccess: (d) => toast.success(d?.sent ? `Email sent to ${d.recipients?.length} recipient(s)` : d?.reason || 'Not sent'),
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to send email'),
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: 'product-sales', label: t('posReports.productSales') },
    { key: 'staff', label: t('posReports.staffPerformance') },
    { key: 'tips', label: t('posReports.tipReport') },
    { key: 'cash-recon', label: t('posReports.cashReconciliation') },
  ];

  return (
    <div>
      <PageHeader title={t('posReports.title')} subtitle={activeBranch?.name} />

      {/* Tab bar + period selector */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex gap-1 flex-1">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${tab === tb.key ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
            >
              {tb.label}
            </button>
          ))}
        </div>
        <select value={period} onChange={(e) => setPeriod(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs">
          {PERIODS.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
        </select>
        <button onClick={() => sendEod.mutate()} disabled={sendEod.isPending} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-medium disabled:opacity-50">
          {sendEod.isPending ? '...' : t('posReports.sendEodEmail')}
        </button>
      </div>

      {/* Product Sales Tab */}
      {tab === 'product-sales' && (
        psLoading ? <LoadingSpinner /> : productSales ? (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label={t('posReports.totalQty')} value={productSales.totalQuantity} />
              <Stat label={t('posReports.revenue')} value={Number(productSales.totalRevenue).toFixed(2)} tone="text-emerald-600" />
              <Stat label={t('posReports.cost')} value={Number(productSales.totalCost).toFixed(2)} tone="text-rose-600" />
            </div>
            {/* Category summary */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 mb-2">{t('posReports.byCategory')}</h3>
              <div className="space-y-1">
                {(productSales.byCategory || []).map((c: any) => (
                  <div key={c.name} className="flex justify-between text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                    <span className="font-medium">{c.name}</span>
                    <span>{c.qty} sold · {Number(c.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Product list */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] uppercase text-gray-500 font-semibold">
                <span className="col-span-5">{t('posReports.product')}</span>
                <span className="col-span-2 text-right">{t('posReports.qty')}</span>
                <span className="col-span-3 text-right">{t('posReports.revenue')}</span>
                <span className="col-span-2 text-right">{t('posReports.gp')}</span>
              </div>
              {(productSales.items || []).slice(0, 50).map((it: any) => (
                <div key={it.product?.id} className="grid grid-cols-12 gap-1 px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                  <span className="col-span-5 truncate">{it.product?.name}</span>
                  <span className="col-span-2 text-right">{it.quantity}</span>
                  <span className="col-span-3 text-right">{Number(it.revenue).toFixed(2)}</span>
                  <span className="col-span-2 text-right text-emerald-600">{Number(it.grossProfit).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* Staff Performance Tab */}
      {tab === 'staff' && (
        spLoading ? <LoadingSpinner /> : staffPerf ? (
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] uppercase text-gray-500 font-semibold">
              <span className="col-span-4">{t('posReports.staff')}</span>
              <span className="col-span-2 text-right">{t('posReports.orders')}</span>
              <span className="col-span-2 text-right">{t('posReports.revenue')}</span>
              <span className="col-span-2 text-right">{t('posReports.avgTicket')}</span>
              <span className="col-span-2 text-right">{t('posReports.tips')}</span>
            </div>
            {(staffPerf || []).map((s: any) => (
              <div key={s.user?.id ?? 'unknown'} className="grid grid-cols-12 gap-1 px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                <span className="col-span-4 truncate">{s.user?.firstName} {s.user?.lastName}</span>
                <span className="col-span-2 text-right">{s.orders}</span>
                <span className="col-span-2 text-right">{Number(s.revenue).toFixed(2)}</span>
                <span className="col-span-2 text-right">{Number(s.avgTicket).toFixed(2)}</span>
                <span className="col-span-2 text-right text-amber-600">{Number(s.tips).toFixed(2)}</span>
              </div>
            ))}
            {!(staffPerf || []).length && <p className="px-3 py-4 text-sm text-gray-400">{t('posReports.noData')}</p>}
          </div>
        ) : null
      )}

      {/* Tip Report Tab */}
      {tab === 'tips' && (
        tipLoading ? <LoadingSpinner /> : tipData ? (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Stat label={t('posReports.totalTips')} value={Number(tipData.totalTips).toFixed(2)} tone="text-amber-600" />
              <Stat label={t('posReports.tippedOrders')} value={tipData.totalOrders} />
              <Stat label={t('posReports.avgTip')} value={Number(tipData.avgTipPerOrder).toFixed(2)} />
            </div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">{t('posReports.tipsByStaff')}</h3>
            <div className="space-y-1 mb-4">
              {(tipData.byStaff || []).map((s: any, i: number) => (
                <div key={i} className="flex justify-between text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                  <span>{s.user?.firstName} {s.user?.lastName}</span>
                  <span className="font-semibold text-amber-600">{Number(s.tips).toFixed(2)} ({s.orders} orders)</span>
                </div>
              ))}
            </div>
            <h3 className="text-xs font-semibold text-gray-500 mb-2">{t('posReports.tipsBySession')}</h3>
            <div className="space-y-1">
              {(tipData.bySession || []).map((s: any, i: number) => (
                <div key={i} className="flex justify-between text-xs bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
                  <span>{s.session?.sessionNo}</span>
                  <span className="font-semibold">{Number(s.tips).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null
      )}

      {/* Cash Reconciliation Tab */}
      {tab === 'cash-recon' && (
        crLoading ? <LoadingSpinner /> : cashRecon ? (
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Stat label={t('posReports.totalSessions')} value={cashRecon.totalSessions} />
              <Stat label={t('posReports.totalVariance')} value={Number(cashRecon.totalVariance).toFixed(2)} tone={cashRecon.totalVariance < 0 ? 'text-red-600' : 'text-emerald-600'} />
              <Stat label={t('posReports.maxShortage')} value={Number(cashRecon.maxShortage).toFixed(2)} tone="text-red-600" />
              <Stat label={t('posReports.maxOverage')} value={Number(cashRecon.maxOverage).toFixed(2)} tone="text-emerald-600" />
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="grid grid-cols-12 gap-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] uppercase text-gray-500 font-semibold">
                <span className="col-span-3">{t('posReports.session')}</span>
                <span className="col-span-3">{t('posReports.closedAt')}</span>
                <span className="col-span-2 text-right">{t('posReports.expected')}</span>
                <span className="col-span-2 text-right">{t('posReports.counted')}</span>
                <span className="col-span-2 text-right">{t('posReports.variance')}</span>
              </div>
              {(cashRecon.sessions || []).map((s: any) => (
                <div key={s.id} className="grid grid-cols-12 gap-1 px-3 py-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                  <span className="col-span-3 truncate">{s.sessionNo}</span>
                  <span className="col-span-3">{s.closedAt ? new Date(s.closedAt).toLocaleDateString() : '—'}</span>
                  <span className="col-span-2 text-right">{Number(s.expectedCash).toFixed(2)}</span>
                  <span className="col-span-2 text-right">{s.closingCounted != null ? Number(s.closingCounted).toFixed(2) : '—'}</span>
                  <span className={`col-span-2 text-right font-semibold ${(s.cashDifference ?? 0) < 0 ? 'text-red-600' : (s.cashDifference ?? 0) > 0 ? 'text-emerald-600' : ''}`}>
                    {s.cashDifference != null ? Number(s.cashDifference).toFixed(2) : '—'}
                  </span>
                </div>
              ))}
              {!(cashRecon.sessions || []).length && <p className="px-3 py-4 text-sm text-gray-400">{t('posReports.noData')}</p>}
            </div>
          </div>
        ) : null
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 text-center">
      <div className="text-[10px] uppercase text-gray-400">{label}</div>
      <div className={`text-lg font-bold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}
