import { useEffect, useMemo, useState } from 'react'

const API_BASE = 'http://localhost:8000/api'

function fetchRows(path) {
  return fetch(`${API_BASE}/${path}`)
    .then((res) => res.json())
    .then((data) => data.rows ?? [])
    .catch(() => [])
}

function getCmeAnalysis(row) {
  return Array.isArray(row?.cme_analyses) && row.cme_analyses.length > 0
    ? row.cme_analyses[0]
    : {}
}

function getCmeSpeed(row) {
  const speed = Number(getCmeAnalysis(row)?.speed ?? row?.speed ?? 0)
  return Number.isFinite(speed) ? speed : 0
}

function getNeoDistanceMiles(row) {
  const miles = Number(row?.miss_distance?.miles ?? row?.miss_distance_miles ?? Number.POSITIVE_INFINITY)
  return Number.isFinite(miles) ? miles : Number.POSITIVE_INFINITY
}

function eventTimestamp(item) {
  const value = item?.type === 'cme'
    ? item?.raw?.start_time
    : item?.type === 'flare'
      ? item?.raw?.begin_time
      : item?.raw?.close_approach_timestamp || item?.raw?.close_approach_date
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 0 : date.getTime()
}

function formatDateTime(value) {
  if (!value) return 'Unknown time'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown time'
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDateOnly(value) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function NotableEventCard({ item, isSelected, onSelect }) {
  return (
    <button
      type="button"
      className={`notable-overlay__item ${isSelected ? 'notable-overlay__item--active' : ''}`}
      onClick={() => onSelect(item)}
    >
      <div className="notable-overlay__item-top">
        <span className="notable-overlay__pill notable-overlay__pill--type">{item.badge}</span>
        <span className="notable-overlay__pill">{item.tag}</span>
      </div>
      <div className="notable-overlay__item-title">{item.title}</div>
      <div className="notable-overlay__item-subtitle">{item.subtitle}</div>
      <div className="notable-overlay__item-time">{item.timeLabel}</div>
    </button>
  )
}

export default function NotableEventsOverlay({
  activeViewEnabled,
  setActiveViewEnabled,
  selectedNotableEvent,
  setSelectedNotableEvent,
}) {
  const [rows, setRows] = useState({ cmes: [], flares: [], neos: [] })
  const [loading, setLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      const [cmes, flares, neos] = await Promise.all([
        fetchRows('cme-events/week'),
        fetchRows('solar-flares/week'),
        fetchRows('neo-events/week'),
      ])

      if (!cancelled) {
        setRows({ cmes, flares, neos })
        setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const notableItems = useMemo(() => {
    const latestCme = [...rows.cmes]
      .sort((a, b) => new Date(b.start_time || 0) - new Date(a.start_time || 0))[0]

    const latestFlare = [...rows.flares]
      .sort((a, b) => new Date(b.begin_time || 0) - new Date(a.begin_time || 0))[0]

    const latestNeo = [...rows.neos]
      .sort((a, b) => new Date(b.close_approach_timestamp || b.close_approach_date || 0) - new Date(a.close_approach_timestamp || a.close_approach_date || 0))[0]

    const items = []

    if (latestCme) {
      const analysis = getCmeAnalysis(latestCme)
      const speed = Math.round(getCmeSpeed(latestCme))
      items.push({
        key: `cme-${latestCme.activity_id ?? latestCme.id}`,
        type: 'cme',
        badge: 'CME',
        title: latestCme.activity_id ? `CME ${latestCme.activity_id}` : 'Recent CME',
        subtitle: latestCme.source_location || analysis?.type || 'Coronal mass ejection',
        tag: speed > 0 ? `${speed} km/s` : (analysis?.type ? `Type ${analysis.type}` : 'Recent event'),
        timeLabel: formatDateTime(latestCme.start_time),
        raw: latestCme,
      })
    }

    if (latestFlare) {
      items.push({
        key: `flare-${latestFlare.flr_id ?? latestFlare.id}`,
        type: 'flare',
        badge: 'FLARE',
        title: latestFlare.flr_id ? `Solar Flare ${latestFlare.flr_id}` : 'Recent Solar Flare',
        subtitle: latestFlare.source_location || 'Solar flare activity',
        tag: latestFlare.class_type ? `Class ${latestFlare.class_type}` : 'Recent event',
        timeLabel: formatDateTime(latestFlare.begin_time),
        raw: latestFlare,
      })
    }

    if (latestNeo) {
      const distanceMiles = getNeoDistanceMiles(latestNeo)
      const distanceLabel = Number.isFinite(distanceMiles)
        ? `${(distanceMiles / 1000000).toFixed(2)}M mi`
        : 'Close approach'
      items.push({
        key: `neo-${latestNeo.neo_id ?? latestNeo.id}`,
        type: 'neo',
        badge: 'NEO',
        title: latestNeo.name || latestNeo.neo_id || 'Near-Earth Object',
        subtitle: latestNeo.orbiting_body ? `Orbiting ${latestNeo.orbiting_body}` : 'Near-Earth object',
        tag: latestNeo?.is_potentially_hazardous ? 'Hazardous' : distanceLabel,
        timeLabel: formatDateOnly(latestNeo.close_approach_timestamp || latestNeo.close_approach_date),
        raw: latestNeo,
      })
    }

    return items.sort((a, b) => eventTimestamp(b) - eventTimestamp(a))
  }, [rows])

  useEffect(() => {
    if (notableItems.length === 0) return
    if (!selectedNotableEvent || !notableItems.some((item) => item.key === selectedNotableEvent.key)) {
      setSelectedNotableEvent(notableItems[0])
      setActiveViewEnabled(true)
    }
  }, [notableItems, selectedNotableEvent, setSelectedNotableEvent, setActiveViewEnabled])

  function handleSelect(item) {
    setSelectedNotableEvent(item)
    setActiveViewEnabled(true)
  }

  return (
    <div className={`notable-overlay ${isExpanded ? 'notable-overlay--expanded' : 'notable-overlay--collapsed'}`}>
      <button
        type="button"
        className="notable-overlay__summaryButton"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
      >
        <div className="notable-overlay__header notable-overlay__header--compact">
          <p className="notable-overlay__eyebrow">Notable Events</p>
          <h2 className="notable-overlay__date">Past 7 Days</h2>
        </div>
        <span className={`notable-overlay__chevron ${isExpanded ? 'notable-overlay__chevron--open' : ''}`}>
          ▾
        </span>
      </button>

      {isExpanded ? (
        <div className="notable-overlay__content">
          <div className="notable-overlay__toggleRow">
            <div className="scene-toggle__label">Active View</div>
            <label className="switch">
              <input
                type="checkbox"
                checked={activeViewEnabled}
                onChange={(e) => setActiveViewEnabled(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="notable-overlay__body">
            {loading ? (
              <div className="notable-overlay__empty">Loading recent notable events…</div>
            ) : notableItems.length > 0 ? (
              notableItems.map((item) => (
                <NotableEventCard
                  key={item.key}
                  item={item}
                  isSelected={selectedNotableEvent?.key === item.key}
                  onSelect={handleSelect}
                />
              ))
            ) : (
              <div className="notable-overlay__empty">
                No notable CME, solar flare, or near-Earth object events were found for the past week.
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
