import { useEffect, useState } from 'react'
import EventCard from './EventCard.jsx'
import RawDataModal from './RawDataModal.jsx'
import './DailyEvents.css'

// 🔥 IMPORTANT: match your backend port
const API_BASE = 'http://localhost:8000'

const TABS = [
  { key: 'flr', label: 'Solar Flares',  icon: '☀', endpoint: '/api/solar-flares/today' },
  { key: 'cme', label: 'CME',           icon: '💨', endpoint: '/api/cme-events/today' },
  { key: 'gst', label: 'Geomag Storms', icon: '🌐', endpoint: '/api/geomagnetic-storms/today' },
]

export default function DailyEvents() {
  const [active, setActive] = useState('flr')
  const [data, setData] = useState({ flr: [], cme: [], gst: [] })
  const [loading, setLoading] = useState({ flr: true, cme: true, gst: true })
  const [error, setError] = useState({ flr: null, cme: null, gst: null })
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    const localDate = new Date().toLocaleDateString('en-CA')
    TABS.forEach(({ key, endpoint }) => {
      fetch(`${API_BASE}${endpoint}?date=${localDate}`)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          return res.json()
        })
        .then(d => {
          const rows = d.rows ?? (Array.isArray(d) ? d : [])
          setData(prev => ({ ...prev, [key]: rows }))
        })
        .catch(err => {
          setError(prev => ({ ...prev, [key]: err.message }))
        })
        .finally(() => {
          setLoading(prev => ({ ...prev, [key]: false }))
        })
    })
  }, [])

  const activeTab = TABS.find(t => t.key === active)

  return (
    <>
      <RawDataModal data={selected} onClose={() => setSelected(null)} />

      <div className="daily-events">
        {/* Header */}
        <div className="daily-events__header">
          <h1 className="daily-events__title">SPACE WEATHER EVENT LOG</h1>
          <p className="daily-events__subtitle">
            NASA DONKI · {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>

        {/* Tabs */}
        <div className="daily-events__tabs">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`daily-events__tab ${active === tab.key ? 'active' : ''}`}
              onClick={() => setActive(tab.key)}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {!loading[tab.key] && (
                <span className="tab-count">{data[tab.key].length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="daily-events__content">
          {loading[active] && (
            <div className="daily-events__loading">
              <span className="loading-spinner" />
              <span>Fetching data from NASA DONKI…</span>
            </div>
          )}

          {error[active] && (
            <div className="daily-events__error">
              ⚠ Failed to load {activeTab.label}: {error[active]}
            </div>
          )}

          {!loading[active] && !error[active] && data[active].length === 0 && (
            <div className="daily-events__empty">
              No {activeTab.label} events today.
            </div>
          )}

          {!loading[active] && !error[active] && data[active].length > 0 && (
            <div className="daily-events__grid">
              {data[active].map((event, i) => (
                <EventCard
                  key={i}
                  event={event}
                  type={active}
                  onClick={() => setSelected(event)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}