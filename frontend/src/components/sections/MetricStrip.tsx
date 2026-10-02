import { motion } from 'framer-motion'
import { StatTile } from '../ui/StatTile'

export function MetricStrip({
  metrics,
}: {
  metrics: { label: string; value: number; unit?: string; suffix?: string }[]
}) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
        >
          <StatTile {...m} />
        </motion.div>
      ))}
    </div>
  )
}
