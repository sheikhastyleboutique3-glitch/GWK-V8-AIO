import { useState, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

type Stage = 'BOOKED' | 'SEATED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
const STAGES: { value: Stage; label: string; color: string; icon: string }[] = [
  { value: 'BOOKED', label: 'Booked', color: 'bg-sky-100 text-sky-700', icon: '📅' },
  { value: 'SEATED', label: 'Seated', color: 'bg-emerald-100 text-emerald-700', icon: '🪑' },
  { value: 'COMPLETED', label: 'Done', color: 'bg-gray-100 text-gray-600', icon: '✓' },
  { value: 'NO_SHOW', label: 'No-Show', color: 'bg-amber-100 text-amber-700', icon: '❌' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: '✕' },
];
const stageInfo = (s: string) => STAGES.find((x) => x.value === s) || STAGES[0];

export default function BookingsPage() {
  const { t } = useTranslation();
  const { activeBranch } = useAuth();
  const qc = useQueryClient();
  const branchId = activeBranch?.id;
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<Stage | 'ALL'>('ALL');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState({ customerName: '', phone: '', reservedAt: '', partySize: '2', tableId: '', notes: '' });

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['bookings', branchId, dateFilter],
    queryFn: () => api.get('/reservations', { params: { branchId, date: dateFilter } }).then((r) => r.data.data),
    enabled: !!branchId,
    refetchInterval: 30_000,
  });

  const { data: tables } = useQuery({
    queryKey: ['tables-for-booking', branchId],
    queryFn: () => api.get('/tables', { params: { branchId } }).then((r) => r.data.data),
    enabled: !!branchId,
    
  });

  const filtered = useMemo(() => {
    if (!reservations) return [];
    if (filter === 'ALL') return reservations;
    return reservations.filter((r: any) => r.status === filter);
  }, [reservations, filter]);

  const create = useMutation({
    mutationFn: () => api.post('/reservations', {
      branchId,
      customerName: form.customerName,
      phone: form.phone || undefined,
      reservedAt: new Date(form.reservedAt).toISOString(),
      partySize: parseInt(form.partySize, 10) || 2,
      tableId: form.tableId ? parseInt(form.tableId, 10) : undefined,
      notes: form.notes || undefined,
    }),
    onSuccess: () => {
      toast.success('Booking created');
      setShowNew(false);
      setForm({ customerName: '', phone: '', reservedAt: '', partySize: '2', tableId: '', notes: '' });
      qc.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Stage }) => api.patch(`/reservations/${id}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bookings'] }); qc.invalidateQueries({ queryKey: ['tables'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  if (!branchId) return <div><PageHeader title="Bookings" /><p className="text-sm text-amber-600">Select a branch first.</p></div>;

  return (
    <div>
      <PageHeader title="Bookings & Reservations" subtitle={activeBranch?.name} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
        <div className="flex gap-1">
          <button onClick={() => setFilter('ALL')} className={`px-3 py-1.5 rounded-lg text-xs ${filter === 'ALL' ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>All</button>
          {STAGES.slice(0, 3).map((s) => (
            <button key={s.value} onClick={() => setFilter(s.value)} className={`px-3 py-1.5 rounded-lg text-xs ${filter === s.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)} className="ms-auto px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">+ New Booking</button>
      </div>

      {/* Timeline / Board */}
      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-2">
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No bookings for this date.</p>}
          {(filtered || []).map((r: any) => {
            const info = stageInfo(r.status);
            const time = new Date(r.reservedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const tableName = tables?.find((t: any) => t.id === r.tableId)?.name;
            return (
              <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 flex flex-wrap items-center gap-3">
                <div className="w-16 text-center">
                  <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{time}</div>
                  <div className="text-[10px] text-gray-400">{r.partySize} guests</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{r.customerName || 'Walk-in'}</div>
                  <div className="text-xs text-gray-500">
                    {r.phone && <span>{r.phone} · </span>}
                    {tableName && <span>Table {tableName} · </span>}
                    {r.notes && <span className="italic">{r.notes}</span>}
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${info.color}`}>
                  {info.icon} {info.label}
                </span>
                {/* Quick actions */}
                <div className="flex gap-1">
                  {r.status === 'BOOKED' && (
                    <>
                      <button onClick={() => setStatus.mutate({ id: r.id, status: 'SEATED' })} className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs">Seat</button>
                      <button onClick={() => setStatus.mutate({ id: r.id, status: 'NO_SHOW' })} className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs">No-Show</button>
                      <button onClick={() => setStatus.mutate({ id: r.id, status: 'CANCELLED' })} className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs">Cancel</button>
                    </>
                  )}
                  {r.status === 'SEATED' && (
                    <button onClick={() => setStatus.mutate({ id: r.id, status: 'COMPLETED' })} className="px-2 py-1 rounded bg-gray-100 text-gray-700 text-xs">Done</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Booking Modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Booking" size="md">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Guest Name *</label>
              <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" placeholder="John Smith" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" placeholder="+974 5555 1234" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Date & Time *</label>
              <input type="datetime-local" value={form.reservedAt} onChange={(e) => setForm({ ...form, reservedAt: e.target.value })}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Party Size</label>
              <input type="number" min={1} max={50} value={form.partySize} onChange={(e) => setForm({ ...form, partySize: e.target.value })}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Table</label>
              <select value={form.tableId} onChange={(e) => setForm({ ...form, tableId: e.target.value })}
                className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
                <option value="">Auto-assign</option>
                {(tables || []).filter((t: any) => t.isActive).map((t: any) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.seats} seats)</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" placeholder="Allergies, special requests..." />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">Cancel</button>
            <button onClick={() => create.mutate()} disabled={!form.customerName || !form.reservedAt || create.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">Create Booking</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
