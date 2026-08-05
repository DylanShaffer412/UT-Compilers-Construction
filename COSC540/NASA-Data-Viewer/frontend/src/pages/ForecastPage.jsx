import { Link } from 'react-router-dom'

export default function ForecastPage() {
  return (
    <div className="page-container">
      <h1 className="page-title">Forecast</h1>
      <p className="page-subtitle">
        Select a forecast category to explore.
      </p>

      <div className="grid-3">
        <Link to="/near-earth-objects" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card forecast-card">
            <h2>NEO</h2>
            <p>Near-Earth object forecast and approach data.</p>
            <span className="nav-btn">Open</span>
          </div>
        </Link>

        <Link to="/geomagnetic-storms" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card forecast-card">
            <h2>GST</h2>
            <p>Geomagnetic storm forecast and Kp activity.</p>
            <span className="nav-btn">Open</span>
          </div>
        </Link>

        <Link to="/cme-events" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card forecast-card">
            <h2>CME</h2>
            <p>Coronal mass ejection forecast and event data.</p>
            <span className="nav-btn">Open</span>
          </div>
        </Link>
      </div>
    </div>
  )
}