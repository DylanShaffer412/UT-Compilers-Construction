import { useState, useEffect, useMemo } from 'react'
import { useWeather } from './WeatherContext.jsx'

const TYPES = [
  { key: 'flares', label: 'Flares',  endpoint: 'http://localhost:8000/api/solar-flares', dateField: 'begin_time' },
  { key: 'cme',    label: 'CME',     endpoint: 'http://localhost:8000/api/cme-events',   dateField: 'start_time' },
  { key: 'storms', label: 'Storms',  endpoint: 'http://localhost:8000/api/gst-events',   dateField: 'start_time' },
  { key: 'neo',    label: 'NEO',     endpoint: 'http://localhost:8000/api/neo-events',   dateField: 'close_approach_date' },
]

function today() {
  return new Date().toISOString().slice(0, 10)
}

function rowKey(type, row) {
  if (type === 'flares') return row.flr_id    ?? row.begin_time
  if (type === 'cme')    return row.activity_id
  if (type === 'storms') return row.gst_id
  if (type === 'neo')    return row.neo_id     ?? row.name
  return JSON.stringify(row)
}

function rowSummary(type, row) {
  if (type === 'flares') {
    return {
      primary:   row.class_type ?? '—',
      secondary: row.source_location ?? 'No location',
      detail:    row.begin_time ? new Date(row.begin_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC' : '—',
    }
  }
  if (type === 'cme') {
    const analyses = Array.isArray(row.cme_analyses) ? row.cme_analyses : (row.cme_analyses ? JSON.parse(row.cme_analyses) : [])
    const speed = analyses[0]?.speed
    return {
      primary:   row.activity_id ?? '—',
      secondary: speed ? `${Math.round(speed)} km/s` : 'Speed unknown',
      detail:    row.source_location ?? 'No location',
    }
  }
  if (type === 'storms') {
    const arr = Array.isArray(row.kp_index) ? row.kp_index : (row.kp_index ? JSON.parse(row.kp_index) : [])
    const maxKp = arr.length ? Math.max(...arr.map(k => k.kpIndex ?? 0)) : null
    return {
      primary:   row.gst_id ?? '—',
      secondary: maxKp !== null ? `Kp ${maxKp}` : 'Kp unknown',
      detail:    row.start_time ? new Date(row.start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
    }
  }
  if (type === 'neo') {
    const dist = parseFloat(row.miss_distance_miles)
    return {
      primary:   row.name ?? '—',
      secondary: !isNaN(dist) ? `${dist.toLocaleString('en-US', { maximumFractionDigits: 0 })} mi` : '—',
      detail:    row.is_potentially_hazardous ? '⚠ Hazardous' : 'Safe',
    }
  }
  return { primary: '—', secondary: '', detail: '' }
}

export default function WeatherWidget() {
  const { selectedFlares, setSelectedFlares, selectedCME, setSelectedCME,
          selectedStorms, setSelectedStorms, selectedNEO, setSelectedNEO } = useWeather()

  const [activeType, setActiveType] = useState('flares')
  const [date,       setDate]       = useState(today())
  const [allData,    setAllData]    = useState({})
  const [loading,    setLoading]    = useState(false)

  const type = TYPES.find(t => t.key === activeType)

  const selectedFor = { flares: selectedFlares, cme: selectedCME, storms: selectedStorms, neo: selectedNEO }
  const setterFor   = { flares: setSelectedFlares, cme: setSelectedCME, storms: setSelectedStorms, neo: setSelectedNEO }

  useEffect(() => {
    if (allData[activeType]) return
    setLoading(true)
    fetch(type.endpoint)
      .then(r => r.json())
      .then(d => setAllData(prev => ({ ...prev, [activeType]: d.rows ?? d })))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeType])

  const rows = useMemo(() => {
    const raw = allData[activeType] ?? []
    if (!date) return raw
    return raw.filter(r => String(r[type.dateField] ?? '').startsWith(date))
  }, [allData, activeType, date])

  const selected    = selectedFor[activeType]
  const setSelected = setterFor[activeType]
  const selectedKeys = useMemo(() => new Set(selected.map(r => rowKey(activeType, r))), [selected, activeType])

  function toggle(row) {
    const key = rowKey(activeType, row)
    setSelected(prev => {
      const already = prev.some(r => rowKey(activeType, r) === key)
      return already ? prev.filter(r => rowKey(activeType, r) !== key) : [...prev, row]
    })
  }

  function toggleAll() {
    const allSelected = rows.every(r => selectedKeys.has(rowKey(activeType, r)))
    if (allSelected) {
      const keys = new Set(rows.map(r => rowKey(activeType, r)))
      setSelected(prev => prev.filter(r => !keys.has(rowKey(activeType, r))))
    } else {
      const keys = new Set(rows.map(r => rowKey(activeType, r)))
      setSelected(prev => [...prev.filter(r => !keys.has(rowKey(activeType, r))), ...rows])
    }
  }

  const allChecked = rows.length > 0 && rows.every(r => selectedKeys.has(rowKey(activeType, r)))
  const totalSelected = selectedFlares.length + selectedCME.length + selectedStorms.length + selectedNEO.length

  return (
    <div style={w.root}>

      {/* Type selector */}
      <div style={w.typeRow}>
        {TYPES.map(t => {
          const count = selectedFor[t.key].length
          return (
            <button
              key={t.key}
              style={{ ...w.typeBtn, ...(activeType === t.key ? w.typeBtnActive : {}) }}
              onClick={() => setActiveType(t.key)}
            >
              {t.label}
              {count > 0 && <span style={w.typeBadge}>{count}</span>}
            </button>
          )
        })}
      </div>

      {/* Date filter */}
      <div style={w.dateRow}>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={w.dateInput}
        />
        {date && (
          <button style={w.allDatesBtn} onClick={() => setDate('')}>All</button>
        )}
      </div>

      {/* Row count + select-all */}
      <div style={w.listHeader}>
        <label style={w.listHeaderLabel}>
          <input type="checkbox" checked={allChecked} onChange={toggleAll} style={w.checkbox} />
          <span>{rows.length} event{rows.length !== 1 ? 's' : ''}</span>
        </label>
        {selectedKeys.size > 0 && (
          <button style={w.clearTypeBtn} onClick={() => setSelected([])}>Clear</button>
        )}
      </div>

      {/* Event list */}
      <div style={w.list}>
        {loading && <div style={w.msg}>Loading…</div>}
        {!loading && rows.length === 0 && <div style={w.msg}>No events for this date.</div>}
        {!loading && rows.map((row, i) => {
          const key     = rowKey(activeType, row)
          const checked = selectedKeys.has(key)
          const { primary, secondary, detail } = rowSummary(activeType, row)
          return (
            <div
              key={key ?? i}
              style={{ ...w.row, ...(checked ? w.rowSelected : {}) }}
              onClick={() => toggle(row)}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(row)}
                onClick={e => e.stopPropagation()}
                style={w.checkbox}
              />
              <div style={w.rowContent}>
                <span style={w.primary}>{primary}</span>
                <span style={w.secondary}>{secondary}</span>
                <span style={w.detail}>{detail}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={w.footer}>
        <span style={w.footerTotal}>{totalSelected} in scene</span>
        {totalSelected > 0 && (
          <button style={w.clearAllBtn} onClick={() => {
            setSelectedFlares([]); setSelectedCME([])
            setSelectedStorms([]); setSelectedNEO([])
          }}>
            Clear All
          </button>
        )}
      </div>
    </div>
  )
}

const w = {
  root: { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: '8px' },
  typeRow: { display: 'flex', gap: '4px', flexWrap: 'wrap' },
  typeBtn: {
    flex: '1 1 auto', padding: '5px 6px', borderRadius: '4px', cursor: 'pointer',
    background: 'rgba(0,10,30,0.5)', border: '1px solid rgba(50,110,200,0.2)',
    color: 'var(--color-text-secondary)', fontSize: '10px', fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
  },
  typeBtnActive: { border: '1px solid rgba(0,212,255,0.5)', color: 'var(--color-accent-cyan)', background: 'rgba(0,212,255,0.06)' },
  typeBadge: {
    background: 'rgba(0,212,255,0.15)', color: 'var(--color-accent-cyan)',
    borderRadius: '8px', padding: '0 5px', fontSize: '9px', fontWeight: 700,
  },
  dateRow: { display: 'flex', gap: '6px', alignItems: 'center' },
  dateInput: {
    flex: 1, background: 'rgba(0,10,30,0.6)', border: '1px solid rgba(50,110,200,0.25)',
    borderRadius: '4px', color: 'var(--color-text-primary)', padding: '5px 7px',
    fontSize: '11px', outline: 'none', colorScheme: 'dark',
  },
  allDatesBtn: {
    padding: '5px 8px', borderRadius: '4px', background: 'transparent',
    border: '1px solid rgba(50,110,200,0.2)', color: 'var(--color-text-muted)',
    fontSize: '10px', cursor: 'pointer',
  },
  listHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 2px',
    borderBottom: '1px solid var(--color-panel-border)',
  },
  listHeaderLabel: {
    display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer',
    fontSize: '10px', color: 'var(--color-text-secondary)',
    fontFamily: "'Share Tech Mono', monospace", letterSpacing: '1px',
  },
  clearTypeBtn: {
    background: 'transparent', border: 'none',
    color: 'var(--color-text-muted)', fontSize: '10px', cursor: 'pointer',
  },
  list: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', minHeight: 0 },
  msg: { padding: '12px 4px', fontSize: '11px', color: 'var(--color-text-muted)', fontFamily: "'Share Tech Mono', monospace" },
  row: {
    display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '7px 6px',
    borderRadius: '3px', cursor: 'pointer', borderLeft: '2px solid transparent',
    transition: 'background 0.12s',
  },
  rowSelected: { background: 'rgba(0,212,255,0.07)', borderLeft: '2px solid rgba(0,212,255,0.4)' },
  rowContent: { display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 },
  primary:   { fontSize: '12px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.5px' },
  secondary: { fontSize: '11px', color: 'var(--color-accent-cyan)', fontFamily: "'Share Tech Mono', monospace" },
  detail:    { fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: "'Share Tech Mono', monospace" },
  checkbox:  { width: '13px', height: '13px', cursor: 'pointer', accentColor: 'var(--color-accent-cyan)', flexShrink: 0, marginTop: '2px' },
  footer: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 2px 0', borderTop: '1px solid var(--color-panel-border)',
    fontFamily: "'Share Tech Mono', monospace", fontSize: '10px',
  },
  footerTotal: { color: 'var(--color-text-muted)', letterSpacing: '1px' },
  clearAllBtn: {
    background: 'transparent', border: 'none',
    color: 'rgba(239,68,68,0.7)', fontSize: '10px', cursor: 'pointer',
  },
}
