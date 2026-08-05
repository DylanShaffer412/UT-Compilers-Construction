import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import './App.css'
import DailyEvents from './DailyEvents'
import MainPage from './pages/MainPage'
import WeeklySummary from './WeeklySummary'
import SolarFlare from './SolarFlare'
import NeoForecastPage from './pages/NeoForecastPage'
import GstForecastPage from './pages/GstForecastPage'
import CmeForecastPage from './pages/CmeForecastPage'
import LunarPhasesPage from './LunarPhases'

function App() {
  const [activeViewEnabled, setActiveViewEnabled] = useState(true)
  const [selectedNotableEvent, setSelectedNotableEvent] = useState(null)
  const [navMenuOpen, setNavMenuOpen] = useState(false)

  function closeNavMenu() {
    setNavMenuOpen(false)
  }

  return (
    <div className="root">
      <BrowserRouter>
        <div className="top-nav">
          <button
            type="button"
            className={`top-nav__menuButton ${navMenuOpen ? 'top-nav__menuButton--open' : ''}`}
            onClick={() => setNavMenuOpen((prev) => !prev)}
            aria-expanded={navMenuOpen}
            aria-label={navMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className={`top-nav-left ${navMenuOpen ? 'top-nav-left--open' : ''}`}>
            <Link to="/" className="nav-btn" onClick={closeNavMenu}>Main</Link>
            <Link to="/daily" className="nav-btn" onClick={closeNavMenu}>Daily</Link>
            <Link to="/weekly" className="nav-btn" onClick={closeNavMenu}>Weekly</Link>
            <Link to="/lunar-phases" className="nav-btn" onClick={closeNavMenu}>Lunar Phases</Link>
            <Link to="/solar-flares" className="nav-btn" onClick={closeNavMenu}>Solar Flares</Link>
            <Link to="/forecast/neo" className="nav-btn" onClick={closeNavMenu}>NEO</Link>
            <Link to="/forecast/gst" className="nav-btn" onClick={closeNavMenu}>GST</Link>
            <Link to="/forecast/cme" className="nav-btn" onClick={closeNavMenu}>CME</Link>
          </div>
        </div>

        <div className="page-container" onClick={closeNavMenu}>
          <Routes>
            <Route
              path="/"
              element={
                <MainPage
                  activeViewEnabled={activeViewEnabled}
                  setActiveViewEnabled={setActiveViewEnabled}
                  selectedNotableEvent={selectedNotableEvent}
                  setSelectedNotableEvent={setSelectedNotableEvent}
                />
              }
            />
            <Route path="/daily" element={<DailyEvents />} />
            <Route path="/weekly" element={<WeeklySummary />} />
            <Route path="/lunar-phases" element={<LunarPhasesPage />} />
            <Route path="/solar-flares" element={<SolarFlare />} />
            <Route path="/forecast/neo" element={<NeoForecastPage />} />
            <Route path="/forecast/gst" element={<GstForecastPage />} />
            <Route path="/forecast/cme" element={<CmeForecastPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        <div className="bottom-panel">
          <h2 className="app-name">AstroMetrics</h2>
          <p className="app-desc">
            Visualizing solar activity, space weather events, and planetary interactions in real time.
          </p>
        </div>
      </BrowserRouter>
    </div>
  )
}

export default App
