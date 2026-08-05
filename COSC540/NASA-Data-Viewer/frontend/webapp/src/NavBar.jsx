import { NavLink } from 'react-router-dom'
import './Navbar.css'

export default function NavBar() {
  return (
    <nav className="topNav">
      <NavLink to="/">Home</NavLink>
      <NavLink to="/events">Today</NavLink>
      <NavLink to="/weekly">Weekly</NavLink>
      <NavLink to="/lunar-phases">Lunar Phases</NavLink>
      <NavLink to="/solar-flares">Solar Flares</NavLink>

      {/* Main structured data hub */}
      <NavLink to="/forecast">Forecast</NavLink>

      {/* Temporarily removed — now handled under Forecast */}
      {/* <NavLink to="/cme-events">CME</NavLink> */}
      {/* <NavLink to="/geomagnetic-storms">Geomag Storms</NavLink> */}
      {/* <NavLink to="/near-earth-objects">NEO</NavLink> */}
    </nav>
  )
}
