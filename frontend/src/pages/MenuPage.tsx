import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';

const EMPTY = {
  name: '', nameAr: '', sku: '', salePrice: '', costPrice: '', categoryId: '',
  description: '', descriptionAr: '', isSellable: true, isAvailable: true,
};

export default function MenuPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<number | ''>('');
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const canWrite = ['SUPER_ADMIN', 'BRANCH_MANAGER'].includes(user?.role || '');

  const { data: products, isLoading } = useQuery({
    queryKey: ['menu-items', search, catFilter],
    queryFn: () => api.get('/products', {
      params: { sellable: true, ...(search && { search }), ...(catFilter && { categoryId: catFilter }) },
    }).then((r) => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => api.get('/categories', { params: { posVisible: true } }).then((r) => r.data.data),
    staleTime: 300_000,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['menu-items'] });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        nameAr: form.nameAr || form.name,
        salePrice: parseFloat(form.salePrice) || 0,
        costPrice: parseFloat(form.costPrice) || 0,
        categoryId: form.categoryId ? parseInt(form.categoryId as string, 10) : undefined,
        description: form.description || undefined,
        descriptionAr: form.descriptionAr || undefined,
        isSellable: form.isSellable,
        isAvailable: form.isAvailable,
        productType: 'MENU',
      };
      if (editId) {
        return api.patch(`/products/${editId}`, payload);
      } else {
        if (form.sku) payload.sku = form.sku;
        return api.post('/products', payload);
      }
    },
    onSuccess: () => {
      toast.success(editId ? t('common.saved') : t('menu.created'));
      setShowForm(false);
      setEditId(null);
      setForm({ ...EMPTY });
      refresh();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const toggleAvail = useMutation({
    mutationFn: ({ id, isAvailable }: { id: number; isAvailable: boolean }) =>
      api.patch(`/products/${id}/availability`, { isAvailable }),
    onSuccess: (_d, v) => {
      toast.success(v.isAvailable ? t('menu.backOn') : t('menu.eightySixed'));
      refresh();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const uploadImage = async (productId: number, file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await api.post(`/products/${productId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(t('menu.imageUploaded'));
      refresh();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name || '',
      nameAr: p.nameAr || '',
      sku: p.sku || '',
      salePrice: String(p.salePrice ?? ''),
      costPrice: String(p.costPrice ?? ''),
      categoryId: String(p.categoryId ?? ''),
      description: p.description || '',
      descriptionAr: p.descriptionAr || '',
      isSellable: p.isSellable !== false,
      isAvailable: p.isAvailable !== false,
    });
    setEditId(p.id);
    setShowForm(true);
  };

  const openNew = () => {
    setForm({ ...EMPTY });
    setEditId(null);
    setShowForm(true);
  };

  // Group by category
  const groups: Record<string, any[]> = {};
  (products || []).forEach((p: any) => {
    const k = p.category?.name || 'Uncategorized';
    (groups[k] = groups[k] || []).push(p);
  });

  return (
    <div>
      <PageHeader title={t('nav.menu')} subtitle="Add, edit & manage your sellable menu items" />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search menu items..."
          className="flex-1 min-w-[180px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value ? parseInt(e.target.value, 10) : '')}
          className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        >
          <option value="">All categories</option>
          {(categories || []).map((c: any) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        {canWrite && (
          <button onClick={openNew} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium">
            + New Item
          </button>
        )}
        <Link to="/recipes" className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">
          📋 Recipes / BOM
        </Link>
      </div>

      {/* Product grid */}
      {isLoading ? <LoadingSpinner /> : (
        <div className="space-y-6">
          {Object.entries(groups).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">{cat}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((p: any) => {
                  const on = p.isAvailable !== false;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border overflow-hidden transition ${on
                        ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900'
                        : 'border-red-300 bg-red-50 dark:bg-red-500/10 opacity-75'}`}
                    >
                      {/* Image area */}
                      <div className="relative h-28 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden group">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-4xl">{p.category?.icon || '🍽️'}</span>
                        )}
                        {canWrite && (
                          <label className="absolute inset-0 bg-black/0 group-hover:bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                            <span className="text-white text-xs font-medium bg-black/60 px-2 py-1 rounded">
                              {uploading ? '...' : '📷 Upload'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) uploadImage(p.id, f);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        )}
                        {!on && (
                          <div className="absolute top-1 right-1 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">86'd</div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <div className="flex justify-between items-start gap-1">
                          <div className="min-w-0">
                            <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                            {p.nameAr && p.nameAr !== p.name && (
                              <div className="text-xs text-gray-500 truncate" dir="rtl">{p.nameAr}</div>
                            )}
                          </div>
                          <span className="text-sm font-bold text-primary whitespace-nowrap">
                            {Number(p.salePrice || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">{p.sku} · cost {Number(p.costPrice || 0).toFixed(2)}</div>

                        {/* Actions */}
                        <div className="flex gap-1.5 mt-2">
                          {canWrite && (
                            <button
                              onClick={() => openEdit(p)}
                              className="flex-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            onClick={() => toggleAvail.mutate({ id: p.id, isAvailable: !on })}
                            className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium ${on
                              ? 'bg-red-50 text-red-600 dark:bg-red-500/10 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 hover:bg-emerald-100'}`}
                          >
                            {on ? '86 Off' : 'Back On'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {!products?.length && <p className="text-sm text-gray-400 text-center py-8">No menu items yet. Click "+ New Item" to add your first dish or drink.</p>}
        </div>
      )}

      {/* Add / Edit Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? 'Edit Menu Item' : 'New Menu Item'} size="lg">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Name (English) *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="e.g. Caffè Latte"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Name (Arabic)</label>
                <input
                  value={form.nameAr}
                  onChange={(e) => setForm({ ...form, nameAr: e.target.value })}
                  dir="rtl"
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="كافيه لاتيه"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Sale Price *</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.salePrice}
                  onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="15.00"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Cost Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="4.50"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Category *</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                >
                  <option value="">Select...</option>
                  {(categories || []).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {!editId && (
              <div>
                <label className="text-xs font-medium text-gray-500">SKU (auto-generated if blank)</label>
                <input
                  value={form.sku}
                  onChange={(e) => setForm({ ...form, sku: e.target.value })}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                  placeholder="MENU-050"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Description (EN)</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Description (AR)</label>
                <textarea
                  value={form.descriptionAr}
                  onChange={(e) => setForm({ ...form, descriptionAr: e.target.value })}
                  dir="rtl"
                  rows={2}
                  className="w-full mt-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isSellable}
                  onChange={(e) => setForm({ ...form, isSellable: e.target.checked })}
                  className="rounded"
                />
                Sellable (shows on POS)
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  className="rounded"
                />
                Available now
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm">
                Cancel
              </button>
              <button
                onClick={() => saveMut.mutate()}
                disabled={!form.name || !form.salePrice || saveMut.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
              >
                {saveMut.isPending ? 'Saving...' : editId ? 'Save Changes' : 'Create Item'}
              </button>
            </div>
          </div>
        </Modal>
    </div>
  );
}
