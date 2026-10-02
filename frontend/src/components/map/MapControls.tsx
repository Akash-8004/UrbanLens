import { Layers, Box, Globe2 } from 'lucide-react'
import { Slider } from '../ui/Slider'
import { Toggle } from '../ui/Toggle'
import { useSelectionStore } from '../../store/selectionStore'
import { LayerSwitch } from './LayerSwitch'
import { BASEMAPS, type BasemapId } from './HeatMap'
import { cn } from '../../lib/cn'

export function MapControls({
  basemap,
  onBasemap,
}: {
  basemap: BasemapId
  onBasemap: (b: BasemapId) => void
}) {
  const layer = useSelectionStore((s) => s.heatLayer)
  const setLayer = useSelectionStore((s) => s.setHeatLayer)
  const opacity = useSelectionStore((s) => s.overlayOpacity)
  const setOpacity = useSelectionStore((s) => s.setOverlayOpacity)
  const show3d = useSelectionStore((s) => s.showBuildings3d)
  const setShow3d = useSelectionStore((s) => s.setShowBuildings3d)
  const pinned = useSelectionStore((s) => s.pinnedLayer)
  const setPinned = useSelectionStore((s) => s.setPinnedLayer)
  const blend = useSelectionStore((s) => s.compareBlend)
  const setBlend = useSelectionStore((s) => s.setCompareBlend)

  return (
    <div className="glass w-52 space-y-3 rounded-xl p-3 shadow-glow">
      <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
        <Globe2 size={14} className="text-accent-cyan" /> Basemap
      </div>
      <div className="grid grid-cols-2 gap-1">
        {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onBasemap(id)}
            className={cn(
              'rounded-md px-2 py-1.5 text-[10px] transition-colors',
              basemap === id
                ? 'bg-accent-cyan/20 text-accent-cyan ring-1 ring-accent-cyan/40'
                : 'bg-panel-alt text-text-muted hover:text-text',
            )}
          >
            {BASEMAPS[id].label}
          </button>
        ))}
      </div>
      <div className="h-px bg-border/80" />
      <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
        <Layers size={14} /> Heat layers
      </div>
      <LayerSwitch layer={layer} onChange={setLayer} />
      <Slider label="Overlay opacity" value={opacity} onChange={setOpacity} min={0.15} max={1} />
      <Toggle checked={show3d} onChange={setShow3d} label="3D buildings" />
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md bg-panel-alt px-2 py-1.5 text-[10px] text-accent-violet hover:bg-panel"
        onClick={() => setPinned(pinned ? null : layer)}
      >
        <Box size={12} /> {pinned ? 'Unpin compare' : 'Pin for A/B compare'}
      </button>
      {pinned && <Slider label="A/B blend" value={blend} onChange={setBlend} min={0} max={1} />}
    </div>
  )
}
