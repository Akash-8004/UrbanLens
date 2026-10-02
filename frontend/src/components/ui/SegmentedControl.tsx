import { cn } from '../../lib/cn'

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex rounded-lg border border-border bg-panel p-0.5', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium',
            value === o.value ? 'bg-panel-alt text-text' : 'text-text-muted',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
