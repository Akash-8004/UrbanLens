import { cn } from '../../lib/cn'

export function Slider({
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  className,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  className?: string
  label?: string
}) {
  return (
    <div className={cn('space-y-1', className)}>
      {label && (
        <div className="flex justify-between text-[10px] text-text-muted">
          <span>{label}</span>
          <span className="font-mono tabular-nums">{Math.round(value * 100)}%</span>
        </div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-full accent-accent-cyan"
      />
    </div>
  )
}
