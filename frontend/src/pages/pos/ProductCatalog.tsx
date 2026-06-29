import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../../lib/api';
import { useDebounce } from '../../lib/useDebounce';
import LoadingSpinner from '../../components/LoadingSpinner';

interface ProductCatalogProps {
  onProductSelect: (product: any) => void;
}

const VIRTUAL_PAGE_SIZE = 60;

const ProductCatalog = React.memo(function ProductCatalog({
  onProductSelect,
}: ProductCatalogProps) {
  const { t } = useTranslation();
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const gridRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(VIRTUAL_PAGE_SIZE);


  const { data: categories } = useQuery({
    queryKey: ['pos-categories'],
    queryFn: () => api.get('/categories', { params: { posVisible: true } }).then((r) => r.data.data),
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['pos-products', categoryId, debouncedSearch],
    queryFn: () =>
      api.get('/products', {
        params: {
          sellable: true,
          available: true,
          productType: 'MENU',
          ...(categoryId && { categoryId }),
          ...(debouncedSearch && { search: debouncedSearch }),
        },
      }).then((r) => r.data.data),
  });

  // Virtual scrolling: show more items as user scrolls
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    if (nearBottom && products && visibleCount < products.length) {
      setVisibleCount((prev) => Math.min(prev + VIRTUAL_PAGE_SIZE, products.length));
    }
  }, [products, visibleCount]);

  // Reset visible count when products change
  const prevProductsLen = useRef(0);
  if (products && products.length !== prevProductsLen.current) {
    prevProductsLen.current = products.length;
    if (visibleCount > products.length) setVisibleCount(VIRTUAL_PAGE_SIZE);
  }

  const visibleProducts = products?.slice(0, visibleCount) ?? [];

  return (
    <div className="lg:col-span-2 overflow-y-auto min-h-0" onScroll={handleScroll} ref={gridRef}>
      {/* Category filter bar */}
      <div className="flex flex-wrap gap-2 mb-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…"
          className="flex-1 min-w-[160px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm"
        />
        <button
          onClick={() => setCategoryId(undefined)}
          className={`px-3 py-2 rounded-lg text-sm ${!categoryId ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
        >
          All
        </button>
        {(categories || []).map((c: any) => (
          <button
            key={c.id}
            onClick={() => setCategoryId(c.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm ${categoryId === c.id ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-800'}`}
          >
            {c.imageUrl ? (
              <img src={c.imageUrl} alt="" className="w-5 h-5 rounded object-cover" />
            ) : c.icon ? (
              <span>{c.icon}</span>
            ) : null}
            {c.name}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {visibleProducts.map((p: any) => (
            <ProductCard key={p.id} product={p} onSelect={onProductSelect} />
          ))}
          {!products?.length && <p className="text-sm text-gray-500 col-span-full">No products found.</p>}
          {products && visibleCount < products.length && (
            <div className="col-span-full text-center py-2">
              <span className="text-xs text-gray-400">Showing {visibleCount} of {products.length} — scroll for more</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});


/**
 * Individual product card — memoized to prevent re-renders when
 * sibling cards update (e.g. category change only re-renders new set).
 */
const ProductCard = React.memo(function ProductCard({
  product,
  onSelect,
}: {
  product: any;
  onSelect: (p: any) => void;
}) {
  return (
    <button
      onClick={() => onSelect(product)}
      className="text-left rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden hover:border-primary hover:shadow-sm active:scale-[0.96] transition-all duration-150 min-h-[120px]"
    >
      <div className="h-20 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <span className="text-3xl">{product.category?.icon || '🍽️'}</span>
        )}
      </div>
      <div className="p-2">
        <div className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2">{product.name}</div>
        <div className="flex justify-between items-center mt-0.5">
          <span className="text-xs text-gray-500">{product.sku}</span>
          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{Number(product.salePrice || product.costPrice || 0).toFixed(2)}</span>
        </div>
      </div>
    </button>
  );
});

export default ProductCatalog;
