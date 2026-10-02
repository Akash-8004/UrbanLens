import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Sidebar } from './components/layout/Sidebar'
import { TopBar } from './components/layout/TopBar'
import { CommandHint } from './components/layout/CommandHint'
import { ToastHost } from './components/ui/Toast'
import { useAppStore } from './store/appStore'
import Overview from './pages/Overview'
import HeatMapPage from './pages/HeatMapPage'
import Drivers from './pages/Drivers'
import Forecast from './pages/Forecast'
import Optimizer from './pages/Optimizer'
import Sensors from './pages/Sensors'
import About from './pages/About'
import { cn } from './lib/cn'

function Layout() {
  const expanded = useAppStore((s) => s.sidebarExpanded)
  const bootstrap = useAppStore((s) => s.bootstrap)
  const location = useLocation()

  useEffect(() => {
    bootstrap()
  }, [bootstrap])

  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className={cn('transition-[margin] duration-300', expanded ? 'ml-[248px]' : 'ml-[72px]')}>
        <TopBar />
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Overview />} />
            <Route path="/heatmap" element={<HeatMapPage />} />
            <Route path="/drivers" element={<Drivers />} />
            <Route path="/forecast" element={<Forecast />} />
            <Route path="/optimizer" element={<Optimizer />} />
            <Route path="/sensors" element={<Sensors />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
      <CommandHint />
      <ToastHost />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
