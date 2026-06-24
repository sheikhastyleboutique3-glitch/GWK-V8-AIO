import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../lib/api';
import PageHeader from './PageHeader';
import LoadingSpinner from './LoadingSpinner';

export interface CrudField {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'select' | 'checkbox';
  options?: { value: string; label: string }[];
  default?: any;
  placeholder?: string;
  step?: string;
}
export interface CrudColumn {
  key: string;
  label: string;
  render?: (row: any) => any;
  align?: 'start' | 'end';
}

interface Props {
  title: string;
  subtitle?: string;
  endpoint: string; // e.g. '/order-presets'
  queryKey: string;
  columns: CrudColumn[];
  fields: CrudField[];
}

export default function ConfigCrud({ title, subtitle, endpoint, queryKey, columns, fields }: Props) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const emptyForm = () => fields.reduce((a, f) => ({ ...a, [f.key]: f.default ?? (f.type === 'checkbox' ? false : f.type === 'number' ? 0 : '') }), {} as any);
  const [form, setForm] = useState<any>(emptyForm());
  const [editId, setEditId] = useState<number | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => api.get(endpoint).then((r) => r.data.data),
  });

  const save = useMutation({
    mutationFn: () => (editId ? api.patch(`${endpoint}/${editId}`, form) : api.post(endpoint, form)),
    onSuccess: () => {
      toast.success(t('common.saved'));
      qc.invalidateQueries({ queryKey: [queryKey] });
      setForm(emptyForm());
      setEditId(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`${endpoint}/${id}`),
    onSuccess: () => {
      toast.success(t('common.deleted'));
      qc.invalidateQueries({ queryKey: [queryKey] });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const startEdit = (row: any) => {
    setEditId(row.id);
    setForm(fields.reduce((a, f) => ({ ...a, [f.key]: row[f.key] ?? f.default ?? (f.type === 'checkbox' ? false : f.type === 'number' ? 0 : '') }), {} as any));
  };

  const required = fields.find((f) => f.type !== 'checkbox')?.key;

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid md:grid-cols-3 gap-5">
        <div className="md:col-span-2">
          {isLoading ? <LoadingSpinner /> : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase text-gray-400 border-b border-gray-100 dark:border-gray-800">
                    {columns.map((c) => <th key={c.key} className={`p-3 text-${c.align ?? 'start'}`}>{c.label}</th>)}
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {(rows || []).map((row: any) => (
                    <tr key={row.id} className={`border-b border-gray-50 dark:border-gray-800/50 ${row.isActive === false ? 'opacity-40' : ''}`}>
                      {columns.map((c) => (
                        <td key={c.key} className={`p-3 text-${c.align ?? 'start'}`}>{c.render ? c.render(row) : String(row[c.key] ?? '—')}</td>
                      ))}
                      <td className="p-3 text-end whitespace-nowrap">
                        <button onClick={() => startEdit(row)} className="text-xs text-primary mr-3">{t('common.edit')}</button>
                        <button onClick={() => remove.mutate(row.id)} className="text-xs text-red-600">{t('common.delete')}</button>
                      </td>
                    </tr>
                  ))}
                  {!rows?.length && <tr><td colSpan={columns.length + 1} className="p-6 text-center text-gray-400">—</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 space-y-3 h-fit">
          <div className="text-sm font-semibold">{editId ? t('common.edit') : t('common.add')}</div>
          {fields.map((f) => (
            f.type === 'checkbox' ? (
              <label key={f.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={!!form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.checked })} />
                {f.label}
              </label>
            ) : f.type === 'select' ? (
              <label key={f.key} className="block text-xs text-gray-500">{f.label}
                <select value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm">
                  {(f.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            ) : (
              <label key={f.key} className="block text-xs text-gray-500">{f.label}
                <input
                  type={f.type === 'number' ? 'number' : 'text'}
                  step={f.step}
                  value={form[f.key] ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? (parseFloat(e.target.value) || 0) : e.target.value })}
                  className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
              </label>
            )
          ))}
          <div className="flex gap-2">
            <button disabled={(required && !form[required]) || save.isPending} onClick={() => save.mutate()} className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50">
              {editId ? t('common.save') : t('common.add')}
            </button>
            {editId && <button onClick={() => { setEditId(null); setForm(emptyForm()); }} className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">{t('common.cancel')}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
