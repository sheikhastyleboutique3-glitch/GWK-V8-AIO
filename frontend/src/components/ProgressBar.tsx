/**
 * ProgressBar — Linear + circular progress indicators.
 * Hardware-accelerated via transform for smooth rendering on POS hardware.
 *
 * Usage:
 *   <ProgressBar value={65} />                         // Determinate linear
 *   <ProgressBar indeterminate />                      // Indeterminate linear
 *   <ProgressBar variant="circular" value={45} />      // Determinate circular
 *   <ProgressBar variant="circular" indeterminate />   // Indeterminate circular
 */

interface LinearProps {
  variant?: 'linear';
  value?: number; // 0–100
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  label?: string;
  showPercent?: boolean;
  className?: string;
}

interface CircularProps {
  variant: 'circular';
  value?: number; // 0–100
  indeterminate?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'success' | 'warning' | 'danger';
  label?: string;
  className?: string;
}

type Props = LinearProps | CircularProps;

const COLOR_MAP = {
  primary: 'var(--accent, #0369a1)',
  success: 'var(--success, #059669)',
  warning: 'var(--warning, #d97706)',
  danger: 'var(--destructive, #dc2626)',
};

const TRACK_COLOR = 'var(--surface-2, #f1f5f9)';

const SIZE_LINEAR = { sm: 'h-1', md: 'h-2', lg: 'h-3' };
const SIZE_CIRCULAR = { sm: 24, md: 36, lg: 48 };
const STROKE_WIDTH = { sm: 3, md: 4, lg: 5 };

export default function ProgressBar(props: Props) {
  const { variant = 'linear', value = 0, indeterminate = false, size = 'md', color = 'primary', label, className = '' } = props;

  if (variant === 'circular') {
    return <CircularProgress value={value} indeterminate={indeterminate} size={size} color={color} label={label} className={className} />;
  }

  const showPercent = (props as LinearProps).showPercent;
  const barColor = COLOR_MAP[color];
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercent) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs font-medium text-fg-muted">{label}</span>}
          {showPercent && !indeterminate && <span className="text-xs font-medium text-fg-muted">{Math.round(clampedValue)}%</span>}
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden ${SIZE_LINEAR[size]}`}
        style={{ backgroundColor: TRACK_COLOR }}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {indeterminate ? (
          <div
            className="h-full rounded-full animate-indeterminate-bar"
            style={{ backgroundColor: barColor, width: '40%' }}
          />
        ) : (
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{ backgroundColor: barColor, width: `${clampedValue}%`, willChange: 'width' }}
          />
        )}
      </div>
    </div>
  );
}

function CircularProgress({
  value = 0,
  indeterminate = false,
  size = 'md',
  color = 'primary',
  label,
  className = '',
}: {
  value: number;
  indeterminate: boolean;
  size: 'sm' | 'md' | 'lg';
  color: 'primary' | 'success' | 'warning' | 'danger';
  label?: string;
  className?: string;
}) {
  const dim = SIZE_CIRCULAR[size];
  const stroke = STROKE_WIDTH[size];
  const radius = (dim - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedValue = Math.min(100, Math.max(0, value));
  const offset = circumference - (clampedValue / 100) * circumference;
  const barColor = COLOR_MAP[color];

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <svg
        width={dim}
        height={dim}
        className={indeterminate ? 'animate-spin' : ''}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        {/* Track */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={TRACK_COLOR}
          strokeWidth={stroke}
        />
        {/* Progress */}
        <circle
          cx={dim / 2}
          cy={dim / 2}
          r={radius}
          fill="none"
          stroke={barColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={indeterminate ? circumference * 0.75 : offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%',
            transition: indeterminate ? 'none' : 'stroke-dashoffset 300ms ease-out',
          }}
        />
      </svg>
      {label && <span className="text-[10px] font-medium text-fg-muted">{label}</span>}
    </div>
  );
}
