import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { GradientButton } from '../ui/GradientButton'

export function HeroBand() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-panel-alt p-8 md:p-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.14),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(6,182,212,0.1),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(#94A3B8_1px,transparent_1px)] [background-size:22px_22px]" />
      <div className="relative">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[10px] uppercase tracking-[0.22em] text-text-muted"
        >
          SJCEM · B.Tech IT · Final Year Major Project
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-3 max-w-3xl bg-gradient-to-r from-thermal-high via-thermal-ext to-accent-violet bg-clip-text text-3xl font-bold tracking-tight text-transparent md:text-5xl"
        >
          See the heat. Understand it. Cool it.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="mt-4 max-w-2xl text-sm leading-relaxed text-text-muted md:text-base"
        >
          UrbanLens fuses land-surface temperature, urban morphology, and live IoT ground truth to locate hotspots,
          explain drivers with SHAP, forecast heat stress, and optimize cooling interventions for Mumbai.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-7 flex flex-wrap gap-3"
        >
          <Link to="/heatmap">
            <GradientButton className="shadow-glow-amber">Explore Heat Map</GradientButton>
          </Link>
          <Link to="/optimizer">
            <GradientButton variant="ghost">Run Scenario</GradientButton>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
