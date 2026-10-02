import { cn } from '../../lib/cn'

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
  className?: string
}) {
  return (
    <div className={cn('flex gap-1 rounded-lg border border-border bg-panel p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            value === t.id ? 'bg-panel-alt text-accent-cyan' : 'text-text-muted hover:text-text',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
