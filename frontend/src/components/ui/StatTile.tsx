import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

export function StatTile({
  label,
  value,
  unit,
  suffix,
  className,
}: {
  label: string
  value: number
  unit?: string
  suffix?: string
  className?: string
}) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(reduced ? value : 0)
  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const t0 = performance.now()
    const dur = 900
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur)
      const eased = 1 - (1 - p) ** 3
      setDisplay(value * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduced])
  return (
    <div className={cn('rounded-lg border border-border/60 bg-panel p-3', className)}>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="font-mono text-xl tabular-nums text-text">
        {display.toFixed(value % 1 ? 1 : 0)}
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
        {suffix}
      </p>
    </div>
  )
}
