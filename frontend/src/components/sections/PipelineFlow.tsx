import { motion } from 'framer-motion'

const STAGES = [
  { title: 'Satellite ingest', desc: 'Landsat 8 LST · Sentinel-2 · ERA5 · OSM · IoT' },
  { title: 'EO processing', desc: 'NDVI/NDBI/MNDWI · morphology · 30 m grid' },
  { title: 'AI / ML core', desc: 'Heat classifier · PINN · forecast · SHAP' },
  { title: 'Mission outputs', desc: 'Street hotspots · scenarios · live feed · exports' },
]

export function PipelineFlow() {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
      {STAGES.map((s, i) => (
        <motion.div
          key={s.title}
          whileHover={{ scale: 1.02 }}
          className="relative flex-1 rounded-xl border border-border bg-panel p-4"
        >
          {i < STAGES.length - 1 && (
            <span className="absolute -right-2 top-1/2 hidden h-0.5 w-4 bg-accent-cyan/40 md:block" />
          )}
          <p className="text-[10px] uppercase tracking-wider text-accent-cyan">Layer {i + 1}</p>
          <p className="mt-1 font-semibold">{s.title}</p>
          <p className="mt-1 text-xs text-text-muted">{s.desc}</p>
          <motion.div
            className="mt-3 h-1 rounded-full bg-gradient-to-r from-accent-cyan/0 via-accent-cyan/60 to-accent-cyan/0"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.div>
      ))}
    </div>
  )
}
