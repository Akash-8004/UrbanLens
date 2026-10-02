import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '../../lib/cn'

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 8 }}
            onClick={(e) => e.stopPropagation()}
            className={cn('glass max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl p-5', className)}
          >
            <div className="mb-3 flex items-center justify-between">
              {title && <h3 className="font-semibold tracking-tight">{title}</h3>}
              <button type="button" onClick={onClose} className="text-text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
