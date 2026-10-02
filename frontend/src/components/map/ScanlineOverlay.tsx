import { motion, useReducedMotion } from 'framer-motion'

export function ScanlineOverlay({ show }: { show?: boolean }) {
  const reduced = useReducedMotion()
  if (!show || reduced) return null
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden opacity-30"
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.25 }}
    >
      <div className="h-24 w-full bg-gradient-to-b from-transparent via-accent-cyan/40 to-transparent animate-scanline" />
    </motion.div>
  )
}
