import { motion, useReducedMotion } from 'framer-motion'

export function Sparkline({ values, color = '#06B6D4' }: { values: number[]; color?: string }) {
  const reduced = useReducedMotion()
  if (!values.length) return null
  const w = 120
  const h = 32
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / range) * h
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={w} height={h} className="overflow-visible">
      <motion.polyline
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        points={pts}
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2 }}
      />
    </svg>
  )
}
