/**
 * Skeleton loading card — shimmer placeholder for dashboard widgets
 * while data is being fetched. Prevents layout shift and looks professional.
 */
export default function SkeletonCard({ rows = 3, className = '' }: { rows?: number; className?: string }) {
  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 animate-pulse ${className}`}>
      {/* Title bar */}
      <div className="flex justify-between items-center mb-4">
        <div className="h-4 w-28 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
      {/* Stat value */}
      <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
      {/* Rows */}
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex justify-between">
            <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
            <div className="h-3 w-12 bg-gray-100 dark:bg-gray-800 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} rows={i % 2 === 0 ? 3 : 4} />
      ))}
    </div>
  );
}
