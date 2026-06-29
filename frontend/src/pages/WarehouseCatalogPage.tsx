import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import PageHeader from '../components/PageHeader';
import LoadingSpinner from '../components/LoadingSpinner';
import { useDebounce } from '../lib/useDebounce';

/**
 * Warehouse Catalog — shows RAW + SEMI_FINISHED products for requisition creation.
 * Staff select items here → navigate to /requisitions/new with the cart.
 * Does NOT show MENU items (those are finished goods sold to customers).
 */
export default function WarehouseCatalogPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [cart, setCart] = useState<Record<number, { productId: number; name: string; nameAr?: string; unit: string; unitId?: number; qty: number }>>({});

  // Fetch RAW + SEMI_FINISHED products (ingredients, supplies, packaging)
  const { data: products, isLoading } = useQuery({
    queryKey: ['catalog-products', debouncedSearch, categoryId],
    queryFn: () => api.get('/products', {
      params: {
        search: debouncedSearch || undefined,
        categoryId: categoryId || undefined,
        // Show RAW and SEMI_FINISHED — NOT MENU items
      },
    }).then(r => r.data.data),
  });

  // Filter out MENU products and inactive/archived items
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p: any) =>
      p.productType !== 'MENU' && p.isActive !== false && p.isArchived !== true
    );
  }, [products]);

  const { data: categories } = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => api.get('/categories').then(r => r.data.data),
  });

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev[product.id];
      if (existing) {
        return { ...prev, [product.id]: { ...existing, qty: existing.qty + 1 } };
      }
      return {
        ...prev,
        [product.id]: {
          productId: product.id,
          name: product.name,
          nameAr: product.nameAr,
          unit: product.unit?.abbreviation || product.unit?.name || 'pc',
          unitId: product.unit?.id,
          qty: 1,
        },
      };
    });
  };

  const cartItems = Object.values(cart);
  const cartCount = cartItems.reduce((s, i) => s + i.qty, 0);

  const goToRequisition = () => {
    navigate('/requisitions/new', { state: { cartItems } });
  };

  return (
    <div>
      <PageHeader title={t('requisition.catalog') || 'Warehouse Catalog'} subtitle="Select ingredients and supplies for your requisition" />

      {/* Search + filter */}
      <div className="flex flex-wrap gap-2 mb-4 items-center">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ingredients, supplies..."
          className="flex-1 min-w-[180px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm"
        />
        <select
          value={categoryId}
          onChange={e => setCategoryId(e.target.value ? parseInt(e.target.value, 10) : '')}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2.5 text-sm"
        >
          <option value="">All Categories</option>
          {(categories || []).map((c: any) => (
            <option key={c.id} value={c.id}>{isRTL ? c.nameAr || c.name : c.name}</option>
          ))}
        </select>
      </div>

      {/* Cart summary bar */}
      {cartCount > 0 && (
        <div className="sticky top-0 z-10 mb-4 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3">
          <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            🛒 {cartCount} item{cartCount !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={goToRequisition}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 active:scale-[0.97] transition"
          >
            Create Requisition →
          </button>
        </div>
      )}

      {/* Product grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map((product: any) => {
            const inCart = cart[product.id];
            return (
              <div
                key={product.id}
                onClick={() => addToCart(product)}
                className={`relative cursor-pointer rounded-xl border bg-white dark:bg-gray-900 p-4 hover:shadow-md active:scale-[0.97] transition-all ${
                  inCart ? 'border-emerald-400 ring-2 ring-emerald-200 dark:ring-emerald-800' : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {/* Image or icon */}
                <div className="h-16 flex items-center justify-center mb-3">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="h-16 w-16 rounded-lg object-cover" />
                  ) : (
                    <span className="text-3xl">{product.category?.icon || '📦'}</span>
                  )}
                </div>
                {/* Name */}
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">
                  {isRTL ? product.nameAr || product.name : product.name}
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{product.sku}</span>
                  <span>{product.unit?.abbreviation || ''}</span>
                </div>
                {/* Product type badge */}
                <div className="mt-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    product.productType === 'RAW' ? 'bg-amber-100 text-amber-700' :
                    product.productType === 'SEMI_FINISHED' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {product.productType === 'RAW' ? '🧱 Raw' : product.productType === 'SEMI_FINISHED' ? '🔧 Semi-Finished' : product.productType}
                  </span>
                </div>
                {/* Cart qty badge */}
                {inCart && (
                  <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow">
                    {inCart.qty}
                  </div>
                )}
              </div>
            );
          })}
          {!filteredProducts.length && (
            <div className="col-span-full text-center py-12 text-gray-400">
              <div className="text-3xl mb-2">📦</div>
              <p>No warehouse items found. Add RAW or SEMI_FINISHED products first.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
