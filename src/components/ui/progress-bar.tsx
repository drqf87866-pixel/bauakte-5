interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  size?: 'sm' | 'md';
  class?: string;
}

export function ProgressBar({ value, max = 100, label, size = 'md', class: extraClass = '' }: ProgressBarProps) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const height = size === 'sm' ? 'h-1.5' : 'h-3';
  return (
    <div class={extraClass}>
      {label && (
        <div class='flex justify-between text-sm text-slate-700 mb-1 font-semibold'>
          <span>{label}</span>
          <span>{value}/{max} ({pct}%)</span>
        </div>
      )}
      <div class={`progress-track ${height}`}
        role='progressbar'
        aria-label={label || 'Fortschritt'}
        aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div class={`progress-fill ${height}`} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}
