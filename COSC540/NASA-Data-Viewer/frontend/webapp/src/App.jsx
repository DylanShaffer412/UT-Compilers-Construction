import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import { WeatherProvider } from './WeatherContext.jsx'
import NavBar from './NavBar.jsx'
import DailyEvents from './DailyEvents.jsx'
import SpaceHome from './SpaceHome.jsx'
import WeeklySummary from './WeeklySummary.jsx'
import SolarFlarePage from './SolarFlare.jsx'
import CMEEventsPage from './CMEEvents.jsx'
import GeomagneticStormsPage from './GeomagneticStorms.jsx'
import NearEarthObjectsPage from './NearEarthObjects.jsx'
import LunarPhasesPage from './LunarPhases.jsx'
import ForecastPage from './ForecastPage.jsx'

function App() {
  return (
    <WeatherProvider>
      <div className="root">
        <BrowserRouter>
          <NavBar />
          <Routes>
            <Route path="/" element={<SpaceHome />} />
            <Route path="/forecast" element={<ForecastPage />} />
            <Route path="/events" element={<DailyEvents />} />
            <Route path="/weekly" element={<WeeklySummary />} />
            <Route path="/solar-flares" element={<SolarFlarePage />} />
            <Route path="/cme-events" element={<CMEEventsPage />} />
            <Route path="/geomagnetic-storms" element={<GeomagneticStormsPage />} />
            <Route path="/near-earth-objects" element={<NearEarthObjectsPage />} />
            <Route path="/lunar-phases" element={<LunarPhasesPage />} />
          </Routes>
        </BrowserRouter>
      </div>
    </WeatherProvider>
  )
}

export default App