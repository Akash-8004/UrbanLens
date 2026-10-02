import { cn } from '../../lib/cn'

export function StatusPulse({ live }: { live?: boolean }) {
  return (
    <span className="relative flex h-2.5 w-2.5">
      {live && <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-accent-cyan opacity-75" />}
      <span className={cn('relative inline-flex h-2.5 w-2.5 rounded-full', live ? 'bg-accent-cyan' : 'bg-text-faint')} />
    </span>
  )
}
