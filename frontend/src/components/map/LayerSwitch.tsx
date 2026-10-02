import { HEATMAP_LAYERS, type HeatmapLayerId } from '../../lib/constants'
import { Tooltip } from '../ui/Tooltip'
import { cn } from '../../lib/cn'

export function LayerSwitch({
  layer,
  onChange,
}: {
  layer: HeatmapLayerId
  onChange: (l: HeatmapLayerId) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      {HEATMAP_LAYERS.map((l) => (
        <Tooltip key={l.id} label={l.label}>
          <button
            type="button"
            onClick={() => onChange(l.id)}
            className={cn(
              'rounded-md px-2 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide',
              layer === l.id ? 'bg-accent-cyan/20 text-accent-cyan' : 'text-text-muted hover:bg-panel-alt',
            )}
          >
            {l.label}
          </button>
        </Tooltip>
      ))}
    </div>
  )
}
