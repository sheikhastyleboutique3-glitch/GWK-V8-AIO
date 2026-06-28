/**
 * Staff Performance Intelligence Dashboard
 *
 * Shows team overview, individual scorecards, improvement suggestions,
 * and leaderboard. Data from GET /staff-performance/report.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';

interface StaffMetric {
  userId: number;
  userName: string;
  role: string;
  score: number;
  improvements: string[];
  metrics: Record<string, number | undefined>;
}

interface TeamReport {
  period: string;
  date: string;
  teamAvg: Record<string, number>;
  topPerformers: StaffMetric[];
  needsImprovement: StaffMetric[];
  allStaff: StaffMetric[];
}

const scoreColor = (s: number) =>
  s >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
  s >= 60 ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20' :
  s >= 40 ? 'text-amber-600 bg-amber-50 dark:bg-amber-900/20' :
  'text-red-600 bg-red-50 dark:bg-red-900/20';

const scoreEmoji = (s: number) => s >= 80 ? '🏆' : s >= 60 ? '👍' : s >= 40 ? '⚠️' : '🔻';

const roleBadge = (role: string) => {
  const colors: Record<string, string> = {
    SUPER_ADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    BRANCH_MANAGER: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    CASHIER: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    WAITER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    KITCHEN: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    BARISTA: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    PASTRY: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  };
  return colors[role] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
};

export default function StaffPerformancePage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const qc = useQueryClient();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedUser, setSelectedUser] = useState<StaffMetric | null>(null);
  const branchId = activeBranch?.id;

  // Check if enabled
  const { data: settings } = useQuery({
    queryKey: ['staff-perf-settings'],
    queryFn: () => api.get('/staff-performance/settings').then(r => r.data.data),
  });

  // Fetch report
  const { data: report, isLoading } = useQuery<TeamReport>({
    queryKey: ['staff-perf-report', branchId, period],
    queryFn: () => api.get('/staff-performance/report', { params: { branchId, period } }).then(r => r.data.data),
    enabled: settings?.enabled !== false,
  });

  // Toggle enable/disable
  const toggleMut = useMutation({
    mutationFn: (enabled: boolean) => api.patch('/staff-performance/settings', { enabled }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-perf-settings'] }); toast.success('Settings updated'); },
  });

  // Regenerate report
  const regenMut = useMutation({
    mutationFn: () => api.get('/staff-performance/generate', { params: { branchId, period } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['staff-perf-report'] }); toast.success('Report regenerated'); },
  });

  if (settings?.enabled === false) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-6xl mb-4">📊</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Staff Performance Intelligence</h2>
        <p className="text-sm text-gray-500 mb-6">This module is currently disabled. Enable it to start tracking and improving staff performance.</p>
        <button onClick={() => toggleMut.mutate(true)} className="px-6 py-3 rounded-xl bg-primary text-white font-medium">
          Enable Module
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader title="📊 Staff Performance" subtitle={`${activeBranch?.name || 'All Branches'} · ${period} report`} />
        <div className="flex items-center gap-2">
          {/* Period selector */}
          {(['daily', 'weekly', 'monthly'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${period === p ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
          <button onClick={() => regenMut.mutate()} disabled={regenMut.isPending}
            className="px-3 py-1.5 rounded-lg text-xs bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 disabled:opacity-50">
            🔄 Refresh
          </button>
          <button onClick={() => toggleMut.mutate(false)}
            className="px-3 py-1.5 rounded-lg text-xs text-red-600 border border-red-200 hover:bg-red-50">
            Disable
          </button>
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : !report ? (
        <div className="text-center py-10 text-gray-500">
          <p>No data yet. Click "Refresh" to generate a report, or wait for the nightly cron (00:30).</p>
        </div>
      ) : (
        <>
          {/* Team Averages */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Avg Speed" value={`${report.teamAvg.avgTransactionTimeSec}s`} icon="⚡" />
            <StatCard label="Avg Ticket" value={`${report.teamAvg.avgTicketSize}`} icon="🎫" />
            <StatCard label="Void Rate" value={`${report.teamAvg.voidRate}%`} icon="❌" />
            <StatCard label="Prep Time" value={`${report.teamAvg.avgPrepTimeMins}m`} icon="🍳" />
            <StatCard label="Overdue" value={`${report.teamAvg.overdueRate}%`} icon="⏰" />
          </div>

          {/* Top Performers */}
          {report.topPerformers.length > 0 && (
            <Section title="🏆 Top Performers" color="emerald">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.topPerformers.map(s => (
                  <StaffCard key={s.userId} staff={s} teamAvg={report.teamAvg} onClick={() => setSelectedUser(s)} />
                ))}
              </div>
            </Section>
          )}

          {/* Needs Improvement */}
          {report.needsImprovement.length > 0 && (
            <Section title="⚠️ Needs Improvement" color="amber">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {report.needsImprovement.map(s => (
                  <StaffCard key={s.userId} staff={s} teamAvg={report.teamAvg} onClick={() => setSelectedUser(s)} />
                ))}
              </div>
            </Section>
          )}

          {/* Full Leaderboard */}
          <Section title="📋 Full Team Leaderboard" color="gray">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-2 pe-3">#</th>
                    <th className="pb-2 pe-3">Staff</th>
                    <th className="pb-2 pe-3">Role</th>
                    <th className="pb-2 pe-3">Score</th>
                    <th className="pb-2 pe-3">Orders</th>
                    <th className="pb-2 pe-3">Revenue</th>
                    <th className="pb-2 pe-3">Speed</th>
                    <th className="pb-2 pe-3">Voids</th>
                    <th className="pb-2 pe-3">Upsell</th>
                    <th className="pb-2">Suggestion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {report.allStaff.map((s, i) => (
                    <tr key={s.userId} onClick={() => setSelectedUser(s)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-2.5 pe-3 font-bold text-gray-400">{i + 1}</td>
                      <td className="py-2.5 pe-3 font-medium text-gray-900 dark:text-gray-100">{s.userName}</td>
                      <td className="py-2.5 pe-3"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleBadge(s.role)}`}>{s.role.replace('_', ' ')}</span></td>
                      <td className="py-2.5 pe-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${scoreColor(s.score)}`}>{scoreEmoji(s.score)} {s.score}</span></td>
                      <td className="py-2.5 pe-3">{s.metrics.ordersCompleted || 0}</td>
                      <td className="py-2.5 pe-3">{(s.metrics.totalRevenue || 0).toFixed(0)}</td>
                      <td className="py-2.5 pe-3">{s.metrics.avgTransactionTimeSec || 0}s</td>
                      <td className="py-2.5 pe-3">{s.metrics.voidRate || 0}%</td>
                      <td className="py-2.5 pe-3">{s.metrics.upsellScore || 0}/100</td>
                      <td className="py-2.5 text-xs text-gray-500 max-w-[200px] truncate">{s.improvements[0]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>
        </>
      )}

      {/* Individual Scorecard Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedUser.userName}</h2>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleBadge(selectedUser.role)}`}>{selectedUser.role.replace('_', ' ')}</span>
              </div>
              <div className={`text-3xl font-bold px-4 py-2 rounded-xl ${scoreColor(selectedUser.score)}`}>
                {selectedUser.score}
              </div>
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <MiniStat label="Orders" value={selectedUser.metrics.ordersCompleted || 0} />
              <MiniStat label="Revenue" value={`${(selectedUser.metrics.totalRevenue || 0).toFixed(0)} QAR`} />
              <MiniStat label="Avg Speed" value={`${selectedUser.metrics.avgTransactionTimeSec || 0}s`} />
              <MiniStat label="Avg Ticket" value={`${(selectedUser.metrics.avgTicketSize || 0).toFixed(2)}`} />
              <MiniStat label="Void Rate" value={`${selectedUser.metrics.voidRate || 0}%`} />
              <MiniStat label="Upsell Score" value={`${selectedUser.metrics.upsellScore || 0}/100`} />
              <MiniStat label="Tables Served" value={selectedUser.metrics.tablesServed || 0} />
              <MiniStat label="Tips Earned" value={`${(selectedUser.metrics.tipsEarned || 0).toFixed(2)}`} />
              <MiniStat label="Prep Time" value={`${(selectedUser.metrics.avgPrepTimeMins || 0).toFixed(1)}m`} />
              <MiniStat label="Hours Worked" value={`${(selectedUser.metrics.hoursWorked || 0).toFixed(1)}h`} />
              <MiniStat label="Cash Variance" value={`${(selectedUser.metrics.cashVariance || 0).toFixed(2)}`} />
              <MiniStat label="Sessions" value={selectedUser.metrics.sessionsWorked || 0} />
            </div>

            {/* Improvement Suggestions */}
            <div className="border-t border-gray-200 dark:border-gray-800 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">💡 Improvement Suggestions</h3>
              <ul className="space-y-2">
                {selectedUser.improvements.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button onClick={() => setSelectedUser(null)} className="w-full mt-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
      <span className="text-xl">{icon}</span>
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden`}>
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function StaffCard({ staff, teamAvg, onClick }: { staff: StaffMetric; teamAvg: Record<string, number>; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-left w-full p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary hover:shadow-sm transition-all">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{staff.userName}</div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${roleBadge(staff.role)}`}>{staff.role.replace('_', ' ')}</span>
        </div>
        <div className={`text-lg font-bold px-2.5 py-1 rounded-lg ${scoreColor(staff.score)}`}>{staff.score}</div>
      </div>
      <div className="text-xs text-gray-500 space-y-0.5">
        <div>{staff.metrics.ordersCompleted || 0} orders · {(staff.metrics.totalRevenue || 0).toFixed(0)} QAR</div>
        <div>Speed: {staff.metrics.avgTransactionTimeSec || 0}s · Voids: {staff.metrics.voidRate || 0}%</div>
      </div>
      {staff.improvements[0] && staff.improvements[0] !== 'Great performance! Keep up the good work.' && (
        <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1">
          💡 {staff.improvements[0]}
        </div>
      )}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
      <div className="text-[10px] text-gray-500 uppercase">{label}</div>
      <div className="text-sm font-bold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}
