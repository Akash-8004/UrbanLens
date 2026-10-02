import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { GlassCard } from '../ui/GlassCard'
import { Sparkline } from '../sensors/Sparkline'

export function ModuleCard({
  title,
  desc,
  icon: Icon,
  spark,
  accent = 'cyan',
}: {
  title: string
  desc: string
  icon: LucideIcon
  spark?: number[]
  accent?: 'cyan' | 'violet' | 'emerald' | 'amber'
}) {
  const border = {
    cyan: 'border-t-accent-cyan',
    violet: 'border-t-accent-violet',
    emerald: 'border-t-accent-emerald',
    amber: 'border-t-thermal-high',
  }[accent]
  return (
    <motion.div whileHover={{ y: -2 }}>
      <GlassCard className={`border-t-2 ${border}`}>
        <Icon className="mb-2 text-accent-cyan" size={22} />
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{desc}</p>
        {spark && <div className="mt-3">{spark.length > 1 && <Sparkline values={spark} />}</div>}
      </GlassCard>
    </motion.div>
  )
}
