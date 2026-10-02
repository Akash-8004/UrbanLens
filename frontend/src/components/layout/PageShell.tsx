import { motion } from 'framer-motion'
import { PAGE_TRANSITION } from '../../lib/constants'
import { cn } from '../../lib/cn'

export function PageShell({
  children,
  className,
  fullBleed,
}: {
  children: React.ReactNode
  className?: string
  fullBleed?: boolean
}) {
  return (
    <motion.div
      {...PAGE_TRANSITION}
      className={cn(fullBleed ? 'p-0' : 'dot-grid p-6', className)}
    >
      {children}
    </motion.div>
  )
}
