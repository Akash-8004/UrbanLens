import { cn } from '../../lib/cn'

export function Badge({
  children,
  color = 'cyan',
  className,
}: {
  children: React.ReactNode
  color?: 'cyan' | 'amber' | 'emerald' | 'violet' | 'blue'
  className?: string
}) {
  const colors = {
    cyan: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
    amber: 'bg-thermal-high/15 text-thermal-high border-thermal-high/30',
    emerald: 'bg-accent-emerald/15 text-accent-emerald border-accent-emerald/30',
    violet: 'bg-accent-violet/15 text-accent-violet border-accent-violet/30',
    blue: 'bg-thermal-low/15 text-thermal-low border-thermal-low/30',
  }
  return (
    <span className={cn('inline-flex rounded border px-2 py-0.5 text-[10px] font-medium uppercase', colors[color], className)}>
      {children}
    </span>
  )
}
