import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import './App.css'
import DailyEvents from './DailyEvents'
import MainPage from './pages/MainPage'
import WeeklySummary from './WeeklySummary'
import SolarFlare from './SolarFlare'
import ForecastPage from './pages/ForecastPage'

function App() {
  const [cmeEnabled, setCmeEnabled] = useState(false)

  return (
    <div className="root">
      <BrowserRouter>
        <div className="top-nav">
          <div className="top-nav-left">
            <Link to="/" className="nav-btn">Main</Link>
            <Link to="/daily" className="nav-btn">Daily</Link>
            <Link to="/weekly" className="nav-btn">Weekly</Link>
            <Link to="/solar-flares" className="nav-btn">Solar Flares</Link>
            <Link to="/forecast" className="nav-btn">Forecast</Link>
          </div>
        </div>

        <div className="page-container">
          <Routes>
            <Route
              path="/"
              element={
                <MainPage
                  cmeEnabled={cmeEnabled}
                  setCmeEnabled={setCmeEnabled}
                />
              }
            />
            <Route path="/daily" element={<DailyEvents />} />
            <Route path="/weekly" element={<WeeklySummary />} />
            <Route path="/solar-flares" element={<SolarFlare />} />
            <Route path="/forecast" element={<ForecastPage />} />
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