import { cn } from '../../lib/cn'

export function Select<T extends string>({
  value,
  onChange,
  options,
  className,
  placeholder,
}: {
  value: T | ''
  onChange: (v: T) => void
  options: { value: T; label: string }[]
  className?: string
  placeholder?: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        'rounded-lg border border-border bg-panel-alt px-3 py-1.5 text-sm text-text outline-none focus:border-accent-cyan/50',
        className,
      )}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
