import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const ENDPOINTS = {
  neo: [
    'http://localhost:8000/api/neows/forecast',
    'http://localhost:8000/api/neows/upcoming',
  ],
  cme: [
    'http://localhost:8000/api/cme',
    'http://localhost:8000/api/cme-events/today',
  ],
  gst: [
    'http://localhost:8000/api/gst',
    'http://localhost:8000/api/geomagnetic-storms',
    'http://localhost:8000/api/geomagnetic-storms/today',
  ],
}

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All Categories' },
  { value: 'neo', label: 'NEO' },
  { value: 'cme', label: 'CME' },
  { value: 'gst', label: 'GST' },
]

const SEVERITY_OPTIONS = [
  { value: 'all', label: 'All Severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Moderate' },
  { value: 'low', label: 'Nominal' },
]

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload?.data)) return payload.data
  if (Array.isArray(payload?.events)) return payload.events
  return []
}

async function fetchFirstWorking(urls) {
  let lastError = null

  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status}`)
        continue
      }

      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        lastError = new Error('Expected JSON response')
        continue
      }

      const json = await res.json()

      return {
        ok: true,
        data: normalizeRows(json),
        source: url,
      }
    } catch (err) {
      lastError = err
    }
  }

  return {
    ok: false,
    data: [],
    source: null,
    error: lastError?.message || 'Unavailable',
  }
}

function getNeoSeverity(item) {
  const hazardous = Boolean(
    item?.is_potentially_hazardous ?? item?.isPotentiallyHazardous
  )
  if (hazardous) return 'high'

  const missDistance = Number(
    item?.miss_distance_miles ?? item?.missDistanceMiles ?? Infinity
  )
  if (missDistance < 1000000) return 'medium'
  return 'low'
}

function getCmeSeverity(item) {
  const analyses = Array.isArray(item?.cme_analyses)
    ? item.cme_analyses
    : item?.cme_analyses
      ? safeJsonParse(item.cme_analyses, [])
      : []

  const speed = Number(analyses?.[0]?.speed ?? item?.speed ?? 0)

  if (speed >= 2000) return 'critical'
  if (speed >= 1000) return 'high'
  if (speed >= 500) return 'medium'
  return 'low'
}

function getGstSeverity(item) {
  const kpArray = Array.isArray(item?.kp_index)
    ? item.kp_index
    : item?.kp_index
      ? safeJsonParse(item.kp_index, [])
      : []

  const kp = kpArray.length > 0
    ? Math.max(...kpArray.map(k => Number(k?.kpIndex ?? 0)))
    : Number(item?.kp_index_max ?? item?.kp ?? 0)

  if (kp >= 8) return 'critical'
  if (kp >= 6) return 'high'
  if (kp >= 4) return 'medium'
  return 'low'
}

function severityLabel(severity) {
  if (severity === 'critical') return 'CRITICAL'
  if (severity === 'high') return 'HIGH'
  if (severity === 'medium') return 'MODERATE'
  return 'NOMINAL'
}

function formatDate(value) {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTimestamp(value) {
  if (!value) return null
  const ts = new Date(value).getTime()
  return Number.isNaN(ts) ? null : ts
}

function buildNeoItems(rows) {
  return rows.map((item, index) => ({
    id: `neo-${item.neo_id ?? item.id ?? index}`,
    category: 'neo',
    severity: getNeoSeverity(item),
    time:
      item.close_approach_datetime ??
      item.approach_date ??
      item.closeApproachDateTime ??
      '',
    title: item.name || `NEO ${item.neo_id ?? index}`,
    subtitle: `Miss Distance: ${Number(item.miss_distance_miles ?? item.missDistanceMiles ?? 0).toLocaleString()} mi`,
    detail: `Velocity: ${Number(item.velocity_mph ?? item.velocityMph ?? 0).toLocaleString()} mph`,
  }))
}

function buildCmeItems(rows) {
  return rows.map((item, index) => {
    const analyses = Array.isArray(item?.cme_analyses)
      ? item.cme_analyses
      : item?.cme_analyses
        ? safeJsonParse(item.cme_analyses, [])
        : []

    const speed = Number(analyses?.[0]?.speed ?? item?.speed ?? 0)

    return {
      id: `cme-${item.activity_id ?? item.activityID ?? index}`,
      category: 'cme',
      severity: getCmeSeverity(item),
      time: item.start_time ?? item.startTime ?? item.time21_5 ?? '',
      title: item.activity_id || item.activityID || `CME ${index + 1}`,
      subtitle: `Speed: ${Math.round(speed).toLocaleString()} km/s`,
      detail: `Source: ${item.source_location || item.sourceLocation || 'Unknown'}`,
    }
  })
}

function buildGstItems(rows) {
  return rows.map((item, index) => {
    const kpArray = Array.isArray(item?.kp_index)
      ? item.kp_index
      : item?.kp_index
        ? safeJsonParse(item.kp_index, [])
        : []

    const kp = kpArray.length > 0
      ? Math.max(...kpArray.map(k => Number(k?.kpIndex ?? 0)))
      : Number(item?.kp_index_max ?? item?.kp ?? 0)

    return {
      id: `gst-${item.gst_id ?? item.gstID ?? index}`,
      category: 'gst',
      severity: getGstSeverity(item),
      time: item.start_time ?? item.startTime ?? '',
      title: item.gst_id || item.gstID || `GST ${index + 1}`,
      subtitle: `Max Kp: ${kp}`,
      detail: 'Geomagnetic storm activity',
    }
  })
}

export default function ForecastPage() {
  const [category, setCategory] = useState('all')
  const [severity, setSeverity] = useState('all')
  const [dateTimeFilter, setDateTimeFilter] = useState('')
  const [query, setQuery] = useState('')

  const [neoItems, setNeoItems] = useState([])
  const [cmeItems, setCmeItems] = useState([])
  const [gstItems, setGstItems] = useState([])

  const [loading, setLoading] = useState(true)
  const [sourceStatus, setSourceStatus] = useState({
    neo: { ok: true, message: '' },
    cme: { ok: true, message: '' },
    gst: { ok: true, message: '' },
  })

  useEffect(() => {
    let isMounted = true

    async function loadForecasts() {
      setLoading(true)

      const [neoResult, cmeResult, gstResult] = await Promise.all([
        fetchFirstWorking(ENDPOINTS.neo),
        fetchFirstWorking(ENDPOINTS.cme),
        fetchFirstWorking(ENDPOINTS.gst),
      ])

      if (!isMounted) return

      setNeoItems(buildNeoItems(neoResult.data))
      setCmeItems(buildCmeItems(cmeResult.data))
      setGstItems(buildGstItems(gstResult.data))

      setSourceStatus({
        neo: neoResult.ok
          ? { ok: true, message: '' }
          : { ok: false, message: 'NEO data unavailable' },
        cme: cmeResult.ok
          ? { ok: true, message: '' }
          : { ok: false, message: 'CME data unavailable' },
        gst: gstResult.ok
          ? { ok: true, message: '' }
          : { ok: false, message: 'GST data unavailable' },
      })

      setLoading(false)
    }

    loadForecasts()

    return () => {
      isMounted = false
    }
  }, [])

  const allItems = useMemo(() => {
    return [...neoItems, ...cmeItems, ...gstItems].sort((a, b) => {
      const aTime = getTimestamp(a.time) ?? 0
      const bTime = getTimestamp(b.time) ?? 0
      return aTime - bTime
    })
  }, [neoItems, cmeItems, gstItems])

  const filteredItems = useMemo(() => {
    const selectedTs = dateTimeFilter ? new Date(dateTimeFilter).getTime() : null

    return allItems.filter(item => {
      const itemTs = getTimestamp(item.time)

      const matchesCategory = category === 'all' || item.category === category
      const matchesSeverity = severity === 'all' || item.severity === severity
      const matchesDateTime =
        selectedTs == null || (itemTs != null && itemTs >= selectedTs)

      const haystack = `${item.title} ${item.subtitle} ${item.detail}`.toLowerCase()
      const matchesQuery =
        query.trim() === '' || haystack.includes(query.toLowerCase())

      return matchesCategory && matchesSeverity && matchesDateTime && matchesQuery
    })
  }, [allItems, category, severity, dateTimeFilter, query])

  return (
    <div className="forecast-page-shell">
      <div className="forecast-page-header">
        <h1 className="forecast-page-title">Forecast</h1>
        <p className="forecast-page-subtitle">NEO, CME, and GST outlook</p>
      </div>

      <div className="forecast-top-links forecast-top-links--cards">
        <Link to="/near-earth-objects" className="forecast-top-link">
          <span className="forecast-top-link-label">NEO</span>
          <span className="forecast-top-link-count">{neoItems.length}</span>
          <span className="forecast-top-link-desc">
            Near-Earth Objects approaching Earth.
          </span>
          {!sourceStatus.neo.ok && (
            <span className="forecast-top-link-note">{sourceStatus.neo.message}</span>
          )}
        </Link>

        <Link to="/cme-events" className="forecast-top-link">
          <span className="forecast-top-link-label">CME</span>
          <span className="forecast-top-link-count">{cmeItems.length}</span>
          <span className="forecast-top-link-desc">
            Coronal Mass Ejections from the Sun.
          </span>
          {!sourceStatus.cme.ok && (
            <span className="forecast-top-link-note">{sourceStatus.cme.message}</span>
          )}
        </Link>

        <Link to="/geomagnetic-storms" className="forecast-top-link">
          <span className="forecast-top-link-label">GST</span>
          <span className="forecast-top-link-count">{gstItems.length}</span>
          <span className="forecast-top-link-desc">
            Geomagnetic Storm activity impacting Earth.
          </span>
          {!sourceStatus.gst.ok && (
            <span className="forecast-top-link-note">{sourceStatus.gst.message}</span>
          )}
        </Link>
      </div>

      <div className="forecast-filters">
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="forecast-filter"
        >
          {CATEGORY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={severity}
          onChange={e => setSeverity(e.target.value)}
          className="forecast-filter"
        >
          {SEVERITY_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={dateTimeFilter}
          onChange={e => setDateTimeFilter(e.target.value)}
          className="forecast-filter"
        />

        <input
          type="text"
          placeholder="Search forecast records"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="forecast-filter"
        />
      </div>

      {loading && <div className="forecast-status">Loading forecast data…</div>}

      {!loading && filteredItems.length === 0 && (
        <div className="forecast-status">
          No forecast records matched the current filters.
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <div className="forecast-list">
          {filteredItems.map(item => (
            <div key={item.id} className="forecast-list-item">
              <div className="forecast-list-item-main">
                <div className="forecast-list-item-category">{item.category}</div>
                <div className="forecast-list-item-title">{item.title}</div>
                <div className="forecast-list-item-subtitle">{item.subtitle}</div>
                <div className="forecast-list-item-detail">{item.detail}</div>
              </div>

              <div className="forecast-list-item-meta">
                <span className={`forecast-severity-badge forecast-severity-badge--${item.severity}`}>
                  {severityLabel(item.severity)}
                </span>
                <div className="forecast-list-item-time">{formatDate(item.time)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}