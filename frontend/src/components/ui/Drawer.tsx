import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = 'right',
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'left' | 'right'
  className?: string
}) {
  const x = side === 'right' ? '100%' : '-100%'
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-bg/60"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x }}
            animate={{ x: 0 }}
            exit={{ x }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className={cn(
              'fixed top-0 z-50 flex h-full w-80 flex-col border-border bg-panel shadow-glow',
              side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
              className,
            )}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold">{title}</h3>
              <button type="button" onClick={onClose} className="text-text-muted">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
