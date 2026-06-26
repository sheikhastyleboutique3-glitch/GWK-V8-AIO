/**
 * StatusBanner — Inline dismissible banners for success/error/warning/info feedback.
 * Replaces static toast-only feedback with persistent, contextual status messages
 * inside forms and batch operations.
 *
 * Usage:
 *   <StatusBanner variant="success" title="Order saved" message="ORD-20250626-B1-00042 created." />
 *   <StatusBanner variant="error" title="Export failed" message="Network timeout." onDismiss={() => setBanner(null)} />
 *   <StatusBanner variant="warning" message="3 items have low stock." />
 *   <StatusBanner variant="info" message="Tip: Use Ctrl+Enter to save faster." dismissible={false} />
 */
import { useState } from 'react';

type Variant = 'success' | 'error' | 'warning' | 'info';

interface Props {
  variant: Variant;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
  action?: { label: string; onClick: () => void };
}

const STYLES: Record<Variant, { bg: string; border: string; icon: string; iconColor: string; textColor: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: '✓',
    iconColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50',
    textColor: 'text-emerald-900 dark:text-emerald-100',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: '✕',
    iconColor: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/50',
    textColor: 'text-red-900 dark:text-red-100',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: '⚠',
    iconColor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50',
    textColor: 'text-amber-900 dark:text-amber-100',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'ℹ',
    iconColor: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50',
    textColor: 'text-blue-900 dark:text-blue-100',
  },
};

export default function StatusBanner({
  variant,
  title,
  message,
  dismissible = true,
  onDismiss,
  className = '',
  action,
}: Props) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  const s = STYLES[variant];

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border} animate-fade-in ${className}`}
      role="alert"
    >
      {/* Icon */}
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.iconColor}`}>
        {s.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {title && <div className={`text-sm font-semibold ${s.textColor}`}>{title}</div>}
        <div className={`text-xs ${title ? 'mt-0.5' : ''} ${s.textColor} opacity-80`}>{message}</div>
        {action && (
          <button
            onClick={action.onClick}
            className={`mt-1.5 text-xs font-medium underline underline-offset-2 ${s.textColor} opacity-70 hover:opacity-100`}
          >
            {action.label}
          </button>
        )}
      </div>

      {/* Dismiss */}
      {dismissible && (
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm leading-none mt-0.5"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}
