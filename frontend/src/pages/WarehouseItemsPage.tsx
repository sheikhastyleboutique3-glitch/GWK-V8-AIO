import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDebounce } from '../lib/useDebounce';

type ProductType = 'RAW' | 'SEMI_FINISHED';

const EMPTY = {
  name: '', nameAr: '', sku: '', costPrice: '', categoryId: '', unitId: '',
  description: '', productType: 'RAW' as ProductType,
  reorderLevel: '', supplierId: '', imageUrl: '',
};

/**
 * Warehouse Items Management — Add/edit RAW and SEMI_FINISHED products.
 * These are ingredients, packaging, and supplies used in production/recipes.
 * They are NOT sold directly to customers (that's the Menu page).
 */
export default function WarehouseItemsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [typeFilter, setTypeFilter] = useState<'' | ProductType>('');
  const [form, setForm] = useState({ ...EMPTY });
  const [editId, setEditId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  const canWrite = ['SUPER_ADMIN', 'BRANCH_MANAGER', 'PROCUREMENT', 'WAREHOUSE'].includes(user?.role || '');

  const { data: products, isLoading } = useQuery({
    queryKey: ['warehouse-items', debouncedSearch, typeFilter],
    queryFn: () => api.get('/products', {
      params: {
        search: debouncedSearch || undefined,
        // When a specific type filter is selected, pass it to backend
        // Otherwise fetch ALL products and filter client-side
        ...(typeFilter ? { productType: typeFilter } : {}),
        // Don't pass sellable=true — warehouse items are NOT sellable
      },
    }).then(r => r.data.data),
  });

  // Filter to show only RAW + SEMI_FINISHED (exclude MENU items)
  const items = (products || []).filter((p: any) =>
    p.productType === 'RAW' || p.productType === 'SEMI_FINISHED'
  );

  const { data: categories } = useQuery({
    queryKey: ['all-categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
  });
  const { data: units } = useQuery({
    queryKey: ['units'],
    queryFn: () => api.get('/units').then(r => r.data.data),
  });
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => api.get('/suppliers').then(r => r.data.data),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['warehouse-items'] });

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: any = {
        name: form.name,
        nameAr: form.nameAr || form.name,
        sku: form.sku || undefined,
        costPrice: parseFloat(form.costPrice) || 0,
        salePrice: 0,
        categoryId: form.categoryId ? parseInt(form.categoryId, 10) : undefined,
        unitId: form.unitId ? parseInt(form.unitId, 10) : undefined,
        supplierId: form.supplierId ? parseInt(form.supplierId, 10) : undefined,
        description: form.description || undefined,
        productType: form.productType,
        isSellable: false,
        isAvailable: true,
        // NOTE: DTO field is reorderPoint (not reorderLevel) — sending the wrong
        // key would be rejected by the global whitelist validator.
        reorderPoint: form.reorderLevel ? parseFloat(form.reorderLevel) : undefined,
      };
      // Step 1: save the product, get its id
      let productId = editId;
      if (editId) {
        await api.patch(`/products/${editId}`, payload);
      } else {
        const res = await api.post('/products', payload);
        productId = res.data.data?.id ?? res.data?.id;
      }
      // Step 2: if a new image was chosen, upload it to the product.
      if (imageFile && productId) {
        setUploadingImg(true);
        try {
          const fd = new FormData();
          fd.append('image', imageFile);
          await api.post(`/products/${productId}/image`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } finally {
          setUploadingImg(false);
        }
      }
    },
    onSuccess: () => {
      toast.success(editId ? 'Item updated' : 'Item created');
      setShowForm(false);
      setEditId(null);
      setForm({ ...EMPTY });
      setImageFile(null);
      refresh();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openEdit = (p: any) => {
    setForm({
      name: p.name || '',
      nameAr: p.nameAr || '',
      sku: p.sku || '',
      costPrice: String(p.costPrice ?? ''),
      categoryId: String(p.categoryId ?? ''),
      unitId: String(p.unitId ?? ''),
      description: p.description || '',
      productType: p.productType || 'RAW',
      reorderLevel: String(p.reorderPoint ?? ''),
      supplierId: String(p.supplierId ?? ''),
      imageUrl: p.imageUrl || '',
    });
    setImageFile(null);
    setEditId(p.id);
    setShowForm(true);
  };

  const openNew = () => {
    setForm({ ...EMPTY });
    setImageFile(null);
    setEditId(null);
    setShowForm(true);
  };

  return (
    <div>
      <PageHeader title="Warehouse Items" subtitle="Manage raw materials, ingredients, packaging & semi-finished goods" />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search items..."
          className="flex-1 min-w-[180px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm">
          <option value="">All Types</option>
          <option value="RAW">🧱 Raw Materials</option>
          <option value="SEMI_FINISHED">🔧 Semi-Finished</option>
        </select>
        {canWrite && (
          <button onClick={openNew} className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold">
            + Add Item
          </button>
        )}
      </div>

      {/* Items table */}
      {isLoading ? <LoadingSpinner /> : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">SKU</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Category</th>
                <th className="text-left px-4 py-3">Unit</th>
                <th className="text-right px-4 py-3">Cost Price</th>
                <th className="text-left px-4 py-3">Supplier</th>
                <th className="text-center px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                        {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">{p.category?.icon || '📦'}</span>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                        {p.nameAr && p.nameAr !== p.name && <div className="text-xs text-gray-400 truncate" dir="rtl">{p.nameAr}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.sku}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.productType === 'RAW' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {p.productType === 'RAW' ? '🧱 Raw' : '🔧 Semi'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs">{p.unit?.abbreviation || p.unit?.name || '—'}</td>
                  <td className="px-4 py-3 text-right font-medium">{Number(p.costPrice || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-xs">{p.supplier?.name || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    {canWrite && (
                      <button onClick={() => openEdit(p)} className="text-primary text-xs font-medium hover:underline">Edit</button>
                    )}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <div className="text-4xl mb-3">📦</div>
                  <p className="text-gray-600 dark:text-gray-300 font-medium mb-1">No warehouse items yet</p>
                  <p className="text-gray-400 text-xs mb-4">
                    Warehouse items are your ingredients and supplies (flour, milk, coffee beans, cups, etc.).<br/>
                    They are used in recipes and requisitions — NOT sold directly to customers.
                  </p>
                  {canWrite && (
                    <button onClick={openNew} className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold">
                      + Add Your First Warehouse Item
                    </button>
                  )}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4">{editId ? 'Edit Item' : 'Add New Warehouse Item'}</h3>
            <div className="space-y-4">
              {/* Item photo */}
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                  {imageFile ? (
                    <img src={URL.createObjectURL(imageFile)} alt="" className="h-full w-full object-cover" />
                  ) : form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl">📦</span>
                  )}
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Photo</label>
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setImageFile(e.target.files?.[0] || null)}
                    className="text-sm text-gray-600 dark:text-gray-300 max-w-full" />
                  <p className="text-[11px] text-gray-400 mt-1">JPG/PNG/WebP, up to 2MB — uploaded when you save.</p>
                </div>
              </div>
              {/* Product Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Product Type *</label>
                <select value={form.productType} onChange={e => setForm(p => ({ ...p, productType: e.target.value as ProductType }))}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm">
                  <option value="RAW">🧱 Raw Material (coffee beans, milk, sugar...)</option>
                  <option value="SEMI_FINISHED">🔧 Semi-Finished (dough, sauce, marinade...)</option>
                </select>
              </div>
              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name (English) *</label>
                  <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm" placeholder="e.g. Whole Milk" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name (Arabic)</label>
                  <input value={form.nameAr} onChange={e => setForm(p => ({ ...p, nameAr: e.target.value }))} dir="rtl"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm" placeholder="حليب كامل" />
                </div>
              </div>
              {/* SKU + Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU</label>
                  <input value={form.sku} onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm" placeholder="Auto-generated if empty" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cost Price *</label>
                  <input type="number" step="0.01" value={form.costPrice} onChange={e => setForm(p => ({ ...p, costPrice: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm" placeholder="0.00" />
                </div>
              </div>
              {/* Category + Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm">
                    <option value="">None</option>
                    {(categories || []).map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!categories?.length && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">No categories yet — add them on the Categories page.</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit</label>
                  <select value={form.unitId} onChange={e => setForm(p => ({ ...p, unitId: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm">
                    <option value="">None</option>
                    {(units || []).map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                  </select>
                </div>
              </div>
              {/* Supplier + Reorder Level */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                  <select value={form.supplierId} onChange={e => setForm(p => ({ ...p, supplierId: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm">
                    <option value="">None</option>
                    {(suppliers || []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reorder Level</label>
                  <input type="number" step="any" value={form.reorderLevel} onChange={e => setForm(p => ({ ...p, reorderLevel: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm" placeholder="Min stock before alert" />
                </div>
              </div>
              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm resize-none" placeholder="Optional notes..." />
              </div>
            </div>
            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium">Cancel</button>
              <button onClick={() => saveMut.mutate()} disabled={!form.name || saveMut.isPending}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold disabled:opacity-50">
                {saveMut.isPending ? 'Saving...' : editId ? 'Update Item' : 'Create Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
