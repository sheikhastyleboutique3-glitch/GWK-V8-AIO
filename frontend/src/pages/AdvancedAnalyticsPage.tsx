import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

type Tab = 'abc' | 'waste' | 'heatmap' | 'clv';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  low: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

const SEGMENT_COLORS: Record<string, string> = {
  Champions: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  Loyal: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  Potential: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  'At Risk': 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  Lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function AdvancedAnalyticsPage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const [tab, setTab] = useState<Tab>('abc');
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const params = useMemo(() => ({
    ...(activeBranch?.id ? { branchId: activeBranch.id } : {}),
    from, to,
  }), [activeBranch?.id, from, to]);

  // ── ABC Analysis ──
  const { data: abcData, isLoading: abcLoading } = useQuery({
    queryKey: ['analytics-abc', params],
    queryFn: () => api.get('/analytics/abc-analysis', { params }).then(r => r.data.data),
    enabled: tab === 'abc',
  });

  // ── Waste Ratio ──
  const { data: wasteData, isLoading: wasteLoading } = useQuery({
    queryKey: ['analytics-waste', params],
    queryFn: () => api.get('/analytics/waste-ratio', { params }).then(r => r.data.data),
    enabled: tab === 'waste',
  });

  // ── Peak Hours ──
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ['analytics-peak', params],
    queryFn: () => api.get('/analytics/peak-hours', { params }).then(r => r.data.data),
    enabled: tab === 'heatmap',
  });

  // ── Customer CLV ──
  const { data: clvData, isLoading: clvLoading } = useQuery({
    queryKey: ['analytics-clv', params],
    queryFn: () => api.get('/analytics/customer-clv', { params }).then(r => r.data.data),
    enabled: tab === 'clv',
  });

  return (
    <div>
      <PageHeader title="Advanced Analytics" subtitle="Deep insights for menu engineering, waste control, staffing, and CRM" />

      {/* Tab bar + date range */}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        {([
          { key: 'abc', label: '📊 ABC Analysis', color: 'bg-blue-600' },
          { key: 'waste', label: '🗑️ Waste Ratio', color: 'bg-orange-600' },
          { key: 'heatmap', label: '🔥 Peak Hours', color: 'bg-red-600' },
          { key: 'clv', label: '💎 Customer CLV', color: 'bg-purple-600' },
        ] as { key: Tab; label: string; color: string }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              tab === t.key ? `${t.color} text-white` : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
        <div className="ms-auto flex items-center gap-2">
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1.5 text-xs" />
        </div>
      </div>

      {/* ── ABC Analysis Tab ── */}
      {tab === 'abc' && (
        abcLoading ? <LoadingSpinner /> : abcData ? (
          <div>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{abcData.summary?.A ?? 0}</div>
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">A Products (80% revenue)</div>
              </div>
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-4 text-center">
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{abcData.summary?.B ?? 0}</div>
                <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">B Products (15% revenue)</div>
              </div>
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 text-center">
                <div className="text-2xl font-bold text-red-700 dark:text-red-300">{abcData.summary?.C ?? 0}</div>
                <div className="text-xs text-red-600 dark:text-red-400 font-medium">C Products (5% revenue)</div>
              </div>
            </div>
            {/* Table */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Product</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-500">Class</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Revenue</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Rev %</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Cum %</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Qty</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">GP %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(abcData.items || []).slice(0, 50).map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2">{item.product?.name || '-'}</td>
                      <td className="text-center px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.classification === 'A' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                          item.classification === 'B' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>{item.classification}</span>
                      </td>
                      <td className="text-right px-3 py-2 font-medium">{Number(item.revenue).toFixed(2)}</td>
                      <td className="text-right px-3 py-2 text-gray-500">{item.revenuePct}%</td>
                      <td className="text-right px-3 py-2 text-gray-500">{item.cumulativePct}%</td>
                      <td className="text-right px-3 py-2">{item.quantity}</td>
                      <td className="text-right px-3 py-2 text-gray-500">{item.grossMarginPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <p className="text-gray-400 text-center py-8">No data for selected period</p>
      )}

      {/* ── Waste Ratio Tab ── */}
      {tab === 'waste' && (
        wasteLoading ? <LoadingSpinner /> : wasteData ? (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
                <div className="text-2xl font-bold">{wasteData.totals?.wasteRatio ?? 0}%</div>
                <div className="text-xs text-gray-500">Overall Waste Ratio</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{Number(wasteData.totals?.totalWasteCost ?? 0).toFixed(2)}</div>
                <div className="text-xs text-gray-500">Total Waste Cost (QAR)</div>
              </div>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
                <div className="text-2xl font-bold">{wasteData.items?.length ?? 0}</div>
                <div className="text-xs text-gray-500">Products with Waste</div>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Product</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Sold</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Wasted</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Waste %</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Cost</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-500">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(wasteData.items || []).map((item: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2">{item.product?.name || '-'}</td>
                      <td className="text-right px-3 py-2">{item.soldQty}</td>
                      <td className="text-right px-3 py-2 text-red-600">{item.wastedQty}</td>
                      <td className="text-right px-3 py-2 font-medium">{item.wasteRatio}%</td>
                      <td className="text-right px-3 py-2">{Number(item.wasteCost).toFixed(2)}</td>
                      <td className="text-center px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${SEVERITY_COLORS[item.severity] || ''}`}>{item.severity}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <p className="text-gray-400 text-center py-8">No waste data for selected period</p>
      )}

      {/* ── Peak Hours Heatmap Tab ── */}
      {tab === 'heatmap' && (
        heatmapLoading ? <LoadingSpinner /> : heatmapData ? (
          <div>
            {heatmapData.peak && (
              <div className="mb-4 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <span className="text-sm font-medium text-red-800 dark:text-red-200">
                  🔥 Peak: <strong>{heatmapData.peak.day} {heatmapData.peak.hour}:00</strong> — {heatmapData.peak.orders} orders
                </span>
              </div>
            )}
            {/* Heatmap grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[80px_repeat(24,1fr)] gap-px bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                  {/* Header row */}
                  <div className="bg-gray-50 dark:bg-gray-900 p-1.5 text-[9px] font-medium text-gray-500 text-center">Day</div>
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="bg-gray-50 dark:bg-gray-900 p-1 text-[9px] font-medium text-gray-500 text-center">
                      {h}
                    </div>
                  ))}
                  {/* Data rows */}
                  {(heatmapData.matrix || []).map((day: any) => (
                    <>
                      <div key={`label-${day.dayIndex}`} className="bg-white dark:bg-gray-900 p-1.5 text-[10px] font-medium text-gray-700 dark:text-gray-300 flex items-center">
                        {day.day.slice(0, 3)}
                      </div>
                      {day.hours.map((cell: any) => {
                        const max = heatmapData.peak?.orders || 1;
                        const intensity = cell.orders / max;
                        const bg = cell.orders === 0 ? 'bg-gray-50 dark:bg-gray-900'
                          : intensity > 0.75 ? 'bg-red-500 text-white'
                          : intensity > 0.5 ? 'bg-orange-400 text-white'
                          : intensity > 0.25 ? 'bg-amber-300 dark:text-gray-900'
                          : 'bg-amber-100 dark:bg-amber-900/30';
                        return (
                          <div
                            key={`${day.dayIndex}-${cell.hour}`}
                            className={`p-1 text-center text-[9px] font-medium ${bg}`}
                            title={`${day.day} ${cell.hour}:00 — ${cell.orders} orders, ${Number(cell.revenue).toFixed(0)} QAR`}
                          >
                            {cell.orders || ''}
                          </div>
                        );
                      })}
                    </>
                  ))}
                </div>
              </div>
            </div>
            {/* Busiest slots */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Top 5 Busiest Slots</h3>
                {(heatmapData.busiestSlots || []).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                    <span>{s.day} {s.hour}:00</span>
                    <span className="font-medium">{s.orders} orders</span>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Quietest Slots</h3>
                {(heatmapData.quietestSlots || []).map((s: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800">
                    <span>{s.day} {s.hour}:00</span>
                    <span className="text-gray-400">{s.orders} orders</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : <p className="text-gray-400 text-center py-8">No order data for selected period</p>
      )}

      {/* ── Customer CLV Tab ── */}
      {tab === 'clv' && (
        clvLoading ? <LoadingSpinner /> : clvData ? (
          <div>
            {/* Segment summary */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(clvData.segments || {}).map(([segment, count]) => (
                <div key={segment} className={`px-3 py-2 rounded-xl text-sm font-medium ${SEGMENT_COLORS[segment] || 'bg-gray-100'}`}>
                  {segment}: {count as number}
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium text-gray-500">Customer</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-500">Segment</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-500">Score</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Lifetime Spend</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Orders</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Avg Order</th>
                    <th className="text-right px-3 py-2.5 font-medium text-gray-500">Last Visit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(clvData.customers || []).slice(0, 30).map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-2">
                        <div className="font-medium">{c.customer?.name || '-'}</div>
                        <div className="text-xs text-gray-400">{c.customer?.phone || ''}</div>
                      </td>
                      <td className="text-center px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${SEGMENT_COLORS[c.segment] || ''}`}>{c.segment}</span>
                      </td>
                      <td className="text-center px-3 py-2 font-bold">{c.clvScore}/15</td>
                      <td className="text-right px-3 py-2 font-medium">{Number(c.monetary).toFixed(2)}</td>
                      <td className="text-right px-3 py-2">{c.frequency}</td>
                      <td className="text-right px-3 py-2">{Number(c.avgOrderValue).toFixed(2)}</td>
                      <td className="text-right px-3 py-2 text-gray-500">{c.recencyDays}d ago</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : <p className="text-gray-400 text-center py-8">No customer data for selected period</p>
      )}
    </div>
  );
}
