import { cn } from '../../lib/cn'

export function Tooltip({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn('group relative inline-flex', className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-panel-alt px-2 py-1 text-[10px] text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        {label}
      </span>
    </span>
  )
}
