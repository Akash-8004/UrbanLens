import { cn } from '../../lib/cn'

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-5 w-9 rounded-full border border-border transition-colors',
          checked ? 'bg-accent-cyan/30' : 'bg-panel-alt',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-text transition-transform',
            checked ? 'left-4' : 'left-0.5',
          )}
        />
      </button>
      {label}
    </label>
  )
}
