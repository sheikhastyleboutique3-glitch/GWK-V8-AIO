import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import DataToolbar from '../components/DataToolbar';
import { usePrompt } from '../lib/usePrompt';

const PROGRAM_TYPES = ['LOYALTY', 'EWALLET', 'GIFT_CARD', 'PROMOTION', 'DISCOUNT', 'COUPON', 'BUY_X_GET_Y'];

export default function LoyaltyPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [prompt, PromptDialog] = usePrompt();
  const [prog, setProg] = useState({ name: '', type: 'LOYALTY', pointsPerCurrency: 1 });
  const [card, setCard] = useState({ programId: '', code: '', balance: 0 });

  const { data: programs, isLoading } = useQuery({
    queryKey: ['loyalty-programs'],
    queryFn: () => api.get('/loyalty/programs').then((r) => r.data.data),
  });
  const { data: cards } = useQuery({
    queryKey: ['loyalty-cards'],
    queryFn: () => api.get('/loyalty/cards').then((r) => r.data.data),
  });

  const createProgram = useMutation({
    mutationFn: () => api.post('/loyalty/programs', prog),
    onSuccess: () => { toast.success(t('common.saved')); qc.invalidateQueries({ queryKey: ['loyalty-programs'] }); setProg({ name: '', type: 'LOYALTY', pointsPerCurrency: 1 }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const issueCard = useMutation({
    mutationFn: () => api.post('/loyalty/cards', { programId: card.programId ? +card.programId : undefined, code: card.code, balance: card.balance }),
    onSuccess: () => { toast.success(t('common.saved')); qc.invalidateQueries({ queryKey: ['loyalty-cards'] }); setCard({ programId: '', code: '', balance: 0 }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const adjust = useMutation({
    mutationFn: ({ code, kind, points, amount }: any) => api.post(`/loyalty/cards/${encodeURIComponent(code)}/${kind}`, { points, amount }),
    onSuccess: () => { toast.success(t('common.saved')); qc.invalidateQueries({ queryKey: ['loyalty-cards'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const doAdjust = async (c: any, kind: 'earn' | 'redeem') => {
    const raw = await prompt({ title: `${kind === 'earn' ? 'Add' : 'Redeem'}`, description: 'Enter points,amount (e.g. 10,0 or 0,25)', defaultValue: '0,0' });
    if (raw == null) return;
    const [points, amount] = raw.split(',').map((x) => parseFloat(x.trim()) || 0);
    adjust.mutate({ code: c.code, kind, points, amount });
  };

  return (
    <div>
      <PageHeader title={t('nav.loyalty')} subtitle={t('loyalty.subtitle')} />
      <PromptDialog />

      {/* Odoo-style toolbar */}
      <DataToolbar
        pageId="loyalty"
        filterFields={[
          { key: 'search', label: 'Program Name / Card Code', type: 'text' as const },
          { key: 'type', label: 'Program Type', type: 'select' as const, options: PROGRAM_TYPES.map(tp => ({ value: tp, label: tp.replace(/_/g, ' ') })) },
        ]}
        groupByFields={[
          { key: 'type', label: 'Type' },
        ]}
        onFilterApply={() => {}}
        groupByValue={[]}
        onGroupByChange={() => {}}
        className="mb-4"
      />

      <div className="grid md:grid-cols-2 gap-5">
        {/* Programs */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-sm font-semibold mb-3">{t('loyalty.programs')}</div>
          {isLoading ? <LoadingSpinner /> : (
            <div className="space-y-2 mb-4">
              {(programs || []).map((p: any) => (
                <div key={p.id} className="flex justify-between text-sm border-b border-gray-50 dark:border-gray-800/50 py-1.5">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-gray-400">{p.type} · {p.pointsPerCurrency}/{p.currency}</span>
                </div>
              ))}
              {!programs?.length && <div className="text-sm text-gray-400">{t('loyalty.noPrograms')}</div>}
            </div>
          )}
          <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
            <input value={prog.name} onChange={(e) => setProg({ ...prog, name: e.target.value })} placeholder={t('loyalty.programName')} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <select value={prog.type} onChange={(e) => setProg({ ...prog, type: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm">
                {PROGRAM_TYPES.map((tp) => <option key={tp} value={tp}>{tp}</option>)}
              </select>
              <input type="number" value={prog.pointsPerCurrency} onChange={(e) => setProg({ ...prog, pointsPerCurrency: parseFloat(e.target.value) || 0 })} placeholder="pts/QAR" className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
            <button disabled={!prog.name || createProgram.isPending} onClick={() => createProgram.mutate()} className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">{t('loyalty.addProgram')}</button>
          </div>
        </div>

        {/* Cards */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
          <div className="text-sm font-semibold mb-3">{t('loyalty.cards')}</div>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {(cards || []).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-sm border-b border-gray-50 dark:border-gray-800/50 py-1.5">
                <span className="font-mono">{c.code}</span>
                <span className="text-gray-500">{c.points} pts · {c.balance.toFixed(2)}</span>
                <span className="flex gap-2">
                  <button onClick={() => doAdjust(c, 'earn')} className="text-xs text-emerald-600">{t('loyalty.earn')}</button>
                  <button onClick={() => doAdjust(c, 'redeem')} className="text-xs text-primary">{t('loyalty.redeem')}</button>
                </span>
              </div>
            ))}
            {!cards?.length && <div className="text-sm text-gray-400">{t('loyalty.noCards')}</div>}
          </div>
          <div className="space-y-2 border-t border-gray-100 dark:border-gray-800 pt-3">
            <div className="grid grid-cols-2 gap-2">
              <select value={card.programId} onChange={(e) => setCard({ ...card, programId: e.target.value })} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-2 text-sm">
                <option value="">{t('loyalty.program')}</option>
                {(programs || []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input value={card.code} onChange={(e) => setCard({ ...card, code: e.target.value })} placeholder={t('loyalty.cardCode')} className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            </div>
            <input type="number" value={card.balance} onChange={(e) => setCard({ ...card, balance: parseFloat(e.target.value) || 0 })} placeholder={t('loyalty.openingBalance')} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm" />
            <button disabled={!card.programId || !card.code || issueCard.isPending} onClick={() => issueCard.mutate()} className="w-full py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">{t('loyalty.issueCard')}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
