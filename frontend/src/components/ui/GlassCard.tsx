import { motion } from 'framer-motion'
import { cn } from '../../lib/cn'

export function GlassCard({
  className,
  children,
  hover = true,
}: {
  className?: string
  children: React.ReactNode
  hover?: boolean
}) {
  return (
    <motion.div
      whileHover={hover ? { y: -2 } : undefined}
      className={cn('glass rounded-xl p-4 shadow-glow transition-colors hover:border-accent-cyan/40', className)}
    >
      {children}
    </motion.div>
  )
}
