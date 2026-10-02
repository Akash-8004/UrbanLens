import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Map,
  BarChart3,
  TrendingUp,
  Sparkles,
  Radio,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../../lib/cn'
import { NAV_ITEMS } from '../../lib/constants'
import { useAppStore } from '../../store/appStore'

const icons: Record<string, React.ComponentType<{ size?: number | string; className?: string }>> = {
  LayoutDashboard,
  Map,
  BarChart3,
  TrendingUp,
  Sparkles,
  Radio,
  Info,
}

function LogoMark() {
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EF4444" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="#0D1220" stroke="url(#lg)" strokeWidth="2" />
      <circle cx="20" cy="20" r="8" fill="none" stroke="#22D3EE" strokeWidth="1.5" opacity="0.8" />
      <path d="M20 4v8M20 28v8M4 20h8M28 20h8" stroke="#3B82F6" strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

export function Sidebar() {
  const expanded = useAppStore((s) => s.sidebarExpanded)
  const toggle = useAppStore((s) => s.toggleSidebar)
  const health = useAppStore((s) => s.health)
  const ok = health?.status === 'ok' || health?.status === 'healthy'

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-border bg-panel transition-[width] duration-300',
        expanded ? 'w-[248px]' : 'w-[72px]',
      )}
    >
      <div className="flex items-center gap-2 border-b border-border p-3">
        <LogoMark />
        {expanded && (
          <div>
            <p className="text-sm font-semibold tracking-tight">UrbanLens</p>
            <p className="text-[10px] text-text-muted">Heat Intelligence</p>
          </div>
        )}
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map((item) => {
          const Icon = icons[item.icon]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-muted transition-colors hover:text-text',
                  isActive && 'text-text',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg border border-accent-cyan/30 bg-panel-alt"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon size={20} className="relative z-10 shrink-0" />
                  {expanded && <span className="relative z-10">{item.label}</span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>
      <div className="border-t border-border p-3">
        {expanded && <p className="mb-2 text-[10px] uppercase tracking-wider text-text-faint">System Status</p>}
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75',
                ok ? 'animate-pulseRing bg-accent-emerald' : 'bg-thermal-ext',
              )}
            />
            <span className={cn('relative inline-flex h-2 w-2 rounded-full', ok ? 'bg-accent-emerald' : 'bg-thermal-ext')} />
          </span>
          {expanded && <span>{ok ? 'API Online' : 'API Offline'}</span>}
        </div>
      </div>
      <button
        type="button"
        onClick={toggle}
        className="border-t border-border p-2 text-text-muted hover:text-text"
        aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        {expanded ? <ChevronLeft className="mx-auto" size={18} /> : <ChevronRight className="mx-auto" size={18} />}
      </button>
    </aside>
  )
}
