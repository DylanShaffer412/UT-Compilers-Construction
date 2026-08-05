import { NavLink } from 'react-router-dom'
import './Navbar.css'

export default function NavBar() {
  return (
    <nav className="topNav">
      <NavLink to="/">Home</NavLink>
      <NavLink to="/events">Today</NavLink>
    </nav>
  )
}