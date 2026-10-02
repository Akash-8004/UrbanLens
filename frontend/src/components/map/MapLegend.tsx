import { motion } from 'framer-motion'
import { HEAT_CLASSES } from '../../lib/constants'
import type { HeatmapResponse } from '../../lib/api'
import { fmtTemp } from '../../lib/format'

export function MapLegend({ data }: { data?: HeatmapResponse | null }) {
  const legend = data?.legend
  const stats = data?.stats
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass rounded-lg p-3 text-xs"
    >
      <p className="mb-2 text-[10px] uppercase tracking-wider text-text-muted">Legend</p>
      {legend?.length ? (
        <div className="space-y-1">
          {legend.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="h-2 w-4 rounded-sm" style={{ background: l.color }} />
              <span>{l.label ?? l.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {HEAT_CLASSES.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <span className="h-2 w-4 rounded-sm" style={{ background: c.color }} />
              <span>{c.label}</span>
            </div>
          ))}
        </div>
      )}
      {stats && (
        <p className="mt-2 font-mono text-[10px] text-text-faint">
          {fmtTemp(stats.min)} – {fmtTemp(stats.max)} · μ {fmtTemp(stats.mean)}
        </p>
      )}
    </motion.div>
  )
}
