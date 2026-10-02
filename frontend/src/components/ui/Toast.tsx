import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '../../store/appStore'

export function ToastHost() {
  const toast = useAppStore((s) => s.toast)
  const setToast = useAppStore((s) => s.setToast)
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="fixed bottom-6 right-6 z-[60] max-w-sm rounded-lg border border-border bg-panel-alt px-4 py-3 text-sm shadow-glow"
        >
          <div className="flex items-start justify-between gap-3">
            <span className={toast.type === 'error' ? 'text-thermal-ext' : 'text-text'}>{toast.message}</span>
            <button type="button" className="text-text-muted" onClick={() => setToast(null)}>
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
