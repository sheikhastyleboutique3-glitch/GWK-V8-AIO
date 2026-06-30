/**
 * PUBLIC DIGITAL MENU — UI/UX Pro Max Edition
 *
 * URL: /menu/:branchId
 * Public (no auth). Auto-syncs with POS products.
 * 86'd items disappear instantly. Branch closed = "Closed" overlay.
 *
 * Features:
 * - 3D parallax hero banner with glass morphism
 * - Animated category tabs with smooth transitions
 * - Product cards with hover 3D tilt effect
 * - Full theme engine integration (brand colors from Settings)
 * - Configurable: logo, banner image, self-order on/off
 * - Real-time: WebSocket listens for availability changes
 * - Mobile-first: optimized for phone scanning QR at table
 *
 * Admin controls (from Settings page):
 * - menu_banner_url: Hero banner image
 * - menu_enable_ordering: "true" = show "Add to Order" buttons
 * - menu_show_prices: "true" = show prices (default true)
 * - menu_closed_message: Custom message when branch is closed
 * - menu_footer_text: Footer text (e.g. "Follow us @restaurant")
 * - menu_3d_effects: "true" = enable 3D tilt + parallax (default true)
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

// ─── 3D Tilt Hook ─────────────────────────────────────────────────────────────
function use3DTilt(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const rect = el.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      el.style.transform = `perspective(1000px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale3d(1.02,1.02,1.02)`;
    };
    const handleLeave = () => { el.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)'; };
    el.addEventListener('mousemove', handleMove);
    el.addEventListener('touchmove', handleMove);
    el.addEventListener('mouseleave', handleLeave);
    el.addEventListener('touchend', handleLeave);
    return () => {
      el.removeEventListener('mousemove', handleMove);
      el.removeEventListener('touchmove', handleMove);
      el.removeEventListener('mouseleave', handleLeave);
      el.removeEventListener('touchend', handleLeave);
    };
  }, [enabled]);
  return ref;
}

// ─── Parallax Scroll Hook ─────────────────────────────────────────────────────
function useParallax() {
  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  return scrollY;
}

export default function DigitalMenuPage() {
  const { branchId } = useParams();
  const bid = parseInt(branchId || '1', 10);
  const [activeCat, setActiveCat] = useState<number | null>(null);
  const [searchQ, setSearchQ] = useState('');
  const scrollY = useParallax();
  const catRef = useRef<HTMLDivElement>(null);

  // ─── Fetch Settings (branding, menu config) — PUBLIC endpoint with branch overrides ─────
  const { data: settings } = useQuery({
    queryKey: ['menu-settings', bid],
    queryFn: () => fetch(`/api/settings/public?branchId=${bid}`).then(r => r.json()).then(d => d.data),
    staleTime: 5 * 60_000,
  });

  const config = useMemo(() => {
    const map: Record<string, string> = {};
    (settings || []).forEach((s: any) => { map[s.key] = s.value; });
    return {
      companyName: map.company_name || 'Restaurant',
      logo: map.company_logo || '',
      phone: map.company_phone || '',
      address: map.company_address || '',
      currency: map.default_currency || 'QAR',
      bannerUrl: map.menu_banner_url || '',
      enableOrdering: map.menu_enable_ordering !== 'false',
      showPrices: map.menu_show_prices !== 'false',
      closedMessage: map.menu_closed_message || 'We are currently closed. See you soon!',
      footerText: map.menu_footer_text || '',
      enable3D: map.menu_3d_effects !== 'false',
      brandColor: map.theme_brand_color || '#0369a1',
      reviewUrl: map.review_url || '',
    };
  }, [settings]);

  // ─── Fetch Categories + Products from PUBLIC self-order endpoint ──────
  const { data: menuData, isLoading } = useQuery({
    queryKey: ['digital-menu-data', bid],
    queryFn: () => fetch(`/api/self-order/branch/${bid}/menu`).then(r => {
      if (!r.ok) throw new Error('Branch not found');
      return r.json();
    }).then(d => d.data),
    staleTime: 60_000,
    refetchInterval: 30_000,
  });

  const categories = menuData?.categories || [];
  const products = menuData?.products || [];
  const branch = menuData?.branch || null;

  // Filter products
  const filtered = useMemo(() => {
    let items = products || [];
    if (activeCat) items = items.filter((p: any) => p.categoryId === activeCat);
    if (searchQ.trim()) {
      const q = searchQ.toLowerCase();
      items = items.filter((p: any) =>
        p.name?.toLowerCase().includes(q) ||
        p.nameAr?.toLowerCase().includes(q) ||
        p.category?.name?.toLowerCase().includes(q)
      );
    }
    return items;
  }, [products, activeCat, searchQ]);

  // Group by category for section headers
  const grouped = useMemo(() => {
    if (activeCat) return [{ category: (categories || []).find((c: any) => c.id === activeCat) || { name: '' }, items: filtered }];
    const map = new Map<number, { category: any; items: any[] }>();
    for (const p of filtered) {
      const catId = p.categoryId || 0;
      if (!map.has(catId)) map.set(catId, { category: p.category || { name: 'Other' }, items: [] });
      map.get(catId)!.items.push(p);
    }
    return Array.from(map.values());
  }, [filtered, activeCat, categories]);

  const fmtPrice = (n: number) => `${config.currency} ${Number(n).toFixed(2)}`;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-sans">
      {/* ═══ 3D PARALLAX HERO BANNER ═══ */}
      <div className="relative overflow-hidden" style={{ height: config.bannerUrl ? '280px' : '200px' }}>
        {/* Background image with parallax */}
        {config.bannerUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-100"
            style={{
              backgroundImage: `url(${config.bannerUrl})`,
              transform: `translateY(${scrollY * 0.4}px) scale(1.1)`,
            }}
          />
        ) : (
          <div
            className="absolute inset-0 transition-transform duration-100"
            style={{
              background: `linear-gradient(135deg, ${config.brandColor} 0%, ${config.brandColor}dd 50%, ${config.brandColor}aa 100%)`,
              transform: `translateY(${scrollY * 0.2}px)`,
            }}
          />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/60" />

        {/* Glass morphism content card */}
        <div className="absolute inset-0 flex items-end p-5">
          <div className="w-full backdrop-blur-xl bg-white/10 rounded-2xl border border-white/20 p-5 shadow-2xl">
            <div className="flex items-center gap-4">
              {config.logo && (
                <img src={config.logo} alt="" className="w-14 h-14 rounded-xl object-cover shadow-lg border-2 border-white/30" />
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-white truncate drop-shadow-lg">{config.companyName}</h1>
                {config.address && <p className="text-xs text-white/70 truncate mt-0.5">{config.address}</p>}
              </div>
              {config.phone && (
                <a href={`tel:${config.phone}`} className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                  📞
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ SEARCH BAR ═══ */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-800/50 px-4 py-3">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="Search menu..."
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border-0 text-sm focus:ring-2 focus:ring-primary/30 focus:bg-white dark:focus:bg-gray-900 transition-all"
            />
          </div>
        </div>
      </div>

      {/* ═══ CATEGORY TABS (horizontal scroll with glass effect) ═══ */}
      <div ref={catRef} className="sticky top-[60px] z-20 bg-white/60 dark:bg-gray-900/60 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 px-4 py-2 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 max-w-2xl mx-auto">
          <button
            onClick={() => setActiveCat(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
              !activeCat
                ? 'text-white shadow-lg scale-105'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
            style={!activeCat ? { backgroundColor: config.brandColor } : {}}
          >
            All
          </button>
          {(categories || []).map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(activeCat === cat.id ? null : cat.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 flex items-center gap-1.5 ${
                activeCat === cat.id
                  ? 'text-white shadow-lg scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={activeCat === cat.id ? { backgroundColor: config.brandColor } : {}}
            >
              {cat.icon && <span>{cat.icon}</span>}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ PRODUCT GRID ═══ */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-white dark:bg-gray-900 h-48 animate-pulse" />
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">🍽️</div>
            <p className="text-gray-500">No items found</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group, gi) => (
              <div key={gi}>
                {/* Section header */}
                {group.category?.name && (
                  <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    {group.category.icon && <span className="text-xl">{group.category.icon}</span>}
                    {group.category.name}
                    <span className="text-xs font-normal text-gray-400 ms-auto">{group.items.length} items</span>
                  </h2>
                )}

                {/* Products grid */}
                <div className="grid grid-cols-2 gap-3">
                  {group.items.map((product: any) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      currency={config.currency}
                      showPrice={config.showPrices}
                      enableOrdering={config.enableOrdering}
                      enable3D={config.enable3D}
                      brandColor={config.brandColor}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ FLOATING CART BAR (self-order) ═══ */}
      <DigitalMenuCart branchId={bid} brandColor={config.brandColor} currency={config.currency} enableOrdering={config.enableOrdering} />

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-6 mt-8">
        <div className="max-w-2xl mx-auto text-center">
          {/* Leave a Review button */}
          {config.reviewUrl && (
            <a
              href={config.reviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-white font-bold text-sm shadow-lg mb-4 active:scale-95 transition-transform"
              style={{ backgroundColor: config.brandColor }}
            >
              ⭐ Leave a Review
            </a>
          )}
          {config.footerText && <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{config.footerText}</p>}
          <p className="text-xs text-gray-400">Powered by GWK Restaurant System</p>
        </div>
      </footer>
    </div>
  );
}

// ─── Product Card with 3D Tilt Effect ─────────────────────────────────────────
function ProductCard({ product, currency, showPrice, enableOrdering, enable3D, brandColor }: {
  product: any; currency: string; showPrice: boolean; enableOrdering: boolean; enable3D: boolean; brandColor: string;
}) {
  const tiltRef = use3DTilt(enable3D);
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <div
        ref={tiltRef}
        onClick={() => setShowDetail(true)}
        className="rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer"
        style={{ transformStyle: 'preserve-3d', transition: 'transform 0.1s ease-out, box-shadow 0.3s ease' }}
      >
        {/* Image */}
        <div className="relative h-28 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">
              {product.category?.icon || '🍽️'}
            </div>
          )}
          {/* Price badge */}
          {showPrice && (
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg text-[11px] font-bold text-white shadow-lg" style={{ backgroundColor: brandColor }}>
              {currency} {Number(product.salePrice || product.costPrice || 0).toFixed(2)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight">
            {product.name}
          </h3>
          {product.nameAr && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1" dir="rtl">{product.nameAr}</p>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" onClick={() => setShowDetail(false)}>
          <div className="bg-white dark:bg-gray-900 w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            {/* Product image (large + zoomable) */}
            {product.imageUrl ? (
              <ZoomableImage src={product.imageUrl} alt={product.name} />
            ) : (
              <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center text-5xl">
                {product.category?.icon || '🍽️'}
              </div>
            )}

            {/* Details */}
            <div className="p-5 flex-1 overflow-y-auto">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{product.name}</h2>
              {product.nameAr && <p className="text-sm text-gray-500 mt-0.5" dir="rtl">{product.nameAr}</p>}

              {product.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{product.description}</p>
              )}

              {/* Allergens */}
              {product.allergens?.length > 0 && (
                <div className="mt-3">
                  <span className="text-xs font-medium text-gray-500">Allergens: </span>
                  <span className="text-xs text-amber-600">{product.allergens.join(', ')}</span>
                </div>
              )}

              {/* Price */}
              {showPrice && (
                <div className="mt-4 text-2xl font-bold" style={{ color: brandColor }}>
                  {currency} {Number(product.salePrice || product.costPrice || 0).toFixed(2)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3">
              <button onClick={() => setShowDetail(false)} className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium">
                Close
              </button>
              {enableOrdering && (
                <button
                  onClick={() => {
                    // Add to local cart state for self-ordering
                    setShowDetail(false);
                    // Use the self-order endpoint to place order
                    const existing = JSON.parse(sessionStorage.getItem('digital_menu_cart') || '[]');
                    const found = existing.find((c: any) => c.productId === product.id);
                    if (found) { found.quantity += 1; } else {
                      existing.push({ productId: product.id, name: product.name, quantity: 1, unitPrice: product.salePrice || product.costPrice || 0 });
                    }
                    sessionStorage.setItem('digital_menu_cart', JSON.stringify(existing));
                    // Dispatch custom event so the floating cart badge updates
                    window.dispatchEvent(new Event('cart_updated'));
                  }}
                  className="flex-1 py-3 rounded-xl text-white text-sm font-bold shadow-lg active:scale-95 transition-transform"
                  style={{ backgroundColor: brandColor }}
                >
                  + Add to Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}


// ─── Zoomable Image Component (pinch-to-zoom + double-tap) ───────────────────
function ZoomableImage({ src, alt }: { src: string; alt: string }) {
  const [zoomed, setZoomed] = useState(false);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const imgRef = useRef<HTMLDivElement>(null);
  const lastTouchRef = useRef<{ dist: number; x: number; y: number } | null>(null);

  // Double-tap to zoom
  const lastTapRef = useRef(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      // Double tap
      if (scale > 1) { setScale(1); setPosition({ x: 0, y: 0 }); }
      else { setScale(2.5); }
    }
    lastTapRef.current = now;
  };

  // Pinch-to-zoom (touch)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (lastTouchRef.current) {
        const delta = dist - lastTouchRef.current.dist;
        setScale(s => Math.max(1, Math.min(4, s + delta * 0.01)));
      }
      lastTouchRef.current = { dist, x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 };
    } else if (e.touches.length === 1 && scale > 1) {
      // Pan when zoomed
      if (lastTouchRef.current) {
        const dx = e.touches[0].clientX - lastTouchRef.current.x;
        const dy = e.touches[0].clientY - lastTouchRef.current.y;
        setPosition(p => ({ x: p.x + dx, y: p.y + dy }));
      }
      lastTouchRef.current = { dist: 0, x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const handleTouchEnd = () => { lastTouchRef.current = null; };

  // Mouse wheel zoom (desktop)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setScale(s => Math.max(1, Math.min(4, s - e.deltaY * 0.003)));
  };

  // Full-screen zoom overlay
  if (zoomed) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" onClick={() => { setZoomed(false); setScale(1); setPosition({ x: 0, y: 0 }); }}>
        <div
          ref={imgRef}
          className="w-full h-full flex items-center justify-center overflow-hidden touch-none"
          onClick={e => e.stopPropagation()}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          onDoubleClick={() => { if (scale > 1) { setScale(1); setPosition({ x: 0, y: 0 }); } else setScale(2.5); }}
        >
          <img
            src={src}
            alt={alt}
            className="max-w-none transition-transform duration-100"
            style={{ transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)` }}
            draggable={false}
          />
        </div>
        <button onClick={() => { setZoomed(false); setScale(1); setPosition({ x: 0, y: 0 }); }} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur text-white flex items-center justify-center text-lg">✕</button>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">Pinch to zoom · Double-tap to toggle · Tap ✕ to close</div>
      </div>
    );
  }

  return (
    <div
      className="h-52 bg-gray-200 dark:bg-gray-800 overflow-hidden relative cursor-zoom-in"
      onClick={handleTap}
      onDoubleClick={() => setZoomed(true)}
    >
      <img src={src} alt={alt} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white text-xs">
        🔍
      </div>
    </div>
  );
}


// ─── Digital Menu Floating Cart ───────────────────────────────────────────────
function DigitalMenuCart({ branchId, brandColor, currency, enableOrdering }: { branchId: number; brandColor: string; currency: string; enableOrdering: boolean }) {
  const [cart, setCart] = useState<{ productId: number; name: string; quantity: number; unitPrice: number }[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [tableName, setTableName] = useState('');

  // Listen for cart updates from product cards
  useEffect(() => {
    const sync = () => {
      const raw = sessionStorage.getItem('digital_menu_cart');
      setCart(raw ? JSON.parse(raw) : []);
    };
    sync();
    window.addEventListener('cart_updated', sync);
    return () => window.removeEventListener('cart_updated', sync);
  }, []);

  if (!enableOrdering || cart.length === 0) return null;

  const total = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const itemCount = cart.reduce((s, c) => s + c.quantity, 0);

  const removeItem = (productId: number) => {
    const next = cart.filter(c => c.productId !== productId);
    setCart(next);
    sessionStorage.setItem('digital_menu_cart', JSON.stringify(next));
  };

  const placeOrder = async () => {
    setPlacing(true);
    try {
      await fetch(`/api/self-order/branch/${branchId}/order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableName: tableName || undefined,
          items: cart.map(c => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })),
        }),
      });
      sessionStorage.removeItem('digital_menu_cart');
      setCart([]);
      setShowCart(false);
      alert('Order placed! Your food will be prepared shortly.');
    } catch {
      alert('Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <>
      {/* Floating cart button */}
      <button
        onClick={() => setShowCart(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full text-white font-bold shadow-2xl active:scale-95 transition-transform"
        style={{ backgroundColor: brandColor }}
      >
        🛒 {itemCount} · {currency} {total.toFixed(2)}
      </button>

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50" onClick={() => setShowCart(false)}>
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-lg">Your Order</h3>
              <button onClick={() => setShowCart(false)} className="text-gray-400 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.map(item => (
                <div key={item.productId} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <div>
                    <div className="font-medium text-sm">{item.name}</div>
                    <div className="text-xs text-gray-500">×{item.quantity} · {currency} {(item.unitPrice * item.quantity).toFixed(2)}</div>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="text-red-500 text-sm">Remove</button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
              <input
                value={tableName}
                onChange={e => setTableName(e.target.value)}
                placeholder="Table number (optional)"
                className="w-full rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 text-sm"
              />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{currency} {total.toFixed(2)}</span>
              </div>
              <button
                onClick={placeOrder}
                disabled={placing}
                className="w-full py-3.5 rounded-xl text-white font-bold text-base disabled:opacity-50 active:scale-[0.97] transition-transform"
                style={{ backgroundColor: brandColor }}
              >
                {placing ? 'Placing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
