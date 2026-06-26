/**
 * LoadingSpinner — Upgraded to a modern skeleton/pulse-based content placeholder.
 * Maintains the same API ({size}) so all existing pages get the upgrade automatically.
 *
 * sm  → inline spinner (for buttons, small areas)
 * md  → skeleton card placeholder (default for page sections)
 * lg  → full-page skeleton with multiple content blocks
 */
export default function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  if (size === 'sm') {
    return (
      <div className="flex items-center justify-center p-2">
        <div
          role="status"
          aria-label="Loading"
          className="h-5 w-5 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-accent"
        />
      </div>
    );
  }

  if (size === 'lg') {
    return (
      <div className="animate-pulse space-y-4 p-6" role="status" aria-label="Loading">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48" />
        </div>
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            </div>
          ))}
        </div>
        {/* Table skeleton */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex gap-3 py-3 px-4 bg-gray-50 dark:bg-gray-800">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-600 rounded flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((r) => (
            <div key={r} className="flex gap-3 py-3 px-4 border-t border-gray-100 dark:border-gray-800">
              {[1, 2, 3, 4].map((c) => (
                <div key={c} className="h-3 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
              ))}
            </div>
          ))}
        </div>
        <span className="sr-only">Loading content...</span>
      </div>
    );
  }

  // size === 'md' (default) — compact skeleton card
  return (
    <div className="animate-pulse space-y-3 p-6" role="status" aria-label="Loading">
      <div className="flex items-center gap-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16 ml-auto" />
      </div>
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded flex-1" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
