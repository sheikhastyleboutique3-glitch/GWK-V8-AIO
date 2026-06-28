import { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt?: string;
  className?: string;
  placeholder?: string;
}

/**
 * LazyImage — Defers image loading until the element is near the viewport.
 * Uses native `loading="lazy"` (supported in all modern browsers) with an
 * IntersectionObserver fallback for edge cases. Shows a lightweight placeholder
 * (gray shimmer) until the image loads, preventing layout shift.
 *
 * Use this in product grids (POS, Menu, Catalog, Kiosk) where 100+ images
 * would otherwise all load simultaneously on page mount.
 */
export default function LazyImage({ src, alt = '', className = '', placeholder }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }, // Start loading 200px before visible
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* Shimmer placeholder */}
      {!loaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-800 animate-pulse" />
      )}
      {/* Actual image — only rendered when in view */}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)} // Hide shimmer even on error
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      )}
      {/* Fallback icon when not in view yet or no src */}
      {!inView && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center text-2xl text-gray-400">
          {placeholder}
        </div>
      )}
    </div>
  );
}
