import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-border/50', className)}>
      <motion.div
        className="h-full bg-gradient-to-r from-accent-cyan to-accent-emerald"
        initial={{ width: 0 }}
        animate={{ width: `${v}%` }}
        transition={{ duration: 0.6 }}
      />
    </div>
  )
}
