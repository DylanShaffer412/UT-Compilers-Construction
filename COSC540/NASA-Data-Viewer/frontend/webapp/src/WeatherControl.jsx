import { useState, useEffect, useMemo } from 'react'
import { useWeather } from './WeatherContext.jsx'

const TABS = [
  { key: 'flares',  label: 'Solar Flares',        endpoint: 'http://localhost:8000/api/solar-flares',  dateField: 'begin_time' },
  { key: 'cme',     label: 'CME',                  endpoint: 'http://localhost:8000/api/cme-events',    dateField: 'start_time' },
  { key: 'storms',  label: 'Geomagnetic Storms',   endpoint: 'http://localhost:8000/api/gst-events',    dateField: 'start_time' },
  { key: 'neo',     label: 'Near-Earth Objects',   endpoint: 'http://localhost:8000/api/neo-events',    dateField: 'close_approach_date' },
]

const COLUMNS = {
  flares: [
    { key: 'class_type',       label: 'Class'          },
    { key: 'begin_time',       label: 'Begin Time'     },
    { key: 'source_location',  label: 'Location'       },
    { key: 'active_region_num',label: 'Active Region'  },
    { key: 'link',             label: 'Link'           },
  ],
  cme: [
    { key: 'activity_id',      label: 'Activity ID'    },
    { key: 'start_time',       label: 'Start Time'     },
    { key: 'source_location',  label: 'Location'       },
    { key: 'cme_analyses',     label: 'Speed'          },
    { key: 'link',             label: 'Link'           },
  ],
  storms: [
    { key: 'gst_id',           label: 'GST ID'         },
    { key: 'start_time',       label: 'Start Time'     },
    { key: 'kp_index',         label: 'Max Kp'         },
    { key: 'link',             label: 'Link'           },
  ],
  neo: [
    { key: 'name',                      label: 'Name'           },
    { key: 'close_approach_date',       label: 'Approach Date'  },
    { key: 'miss_distance_miles',       label: 'Miss Dist (mi)' },
    { key: 'velocity_mph',              label: 'Velocity (mph)' },
    { key: 'is_potentially_hazardous',  label: 'Hazardous'      },
    { key: 'estimated_diameter_min',    label: 'Diam Min (km)'  },
  ],
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

function formatDt(val) {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d)) return val
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function renderCell(col, row) {
  const val = row[col.key]
  if (col.key === 'link') {
    return val ? <a href={val} target="_blank" rel="noreferrer" style={s.link}>View ↗</a> : '—'
  }
  if (col.key === 'begin_time' || col.key === 'start_time' || col.key === 'close_approach_date') {
    return formatDt(val)
  }
  if (col.key === 'cme_analyses') {
    const arr = Array.isArray(val) ? val : (val ? JSON.parse(val) : [])
    const speed = arr[0]?.speed
    return speed ? `${Math.round(speed)} km/s` : '—'
  }
  if (col.key === 'kp_index') {
    const arr = Array.isArray(val) ? val : (val ? JSON.parse(val) : [])
    if (!arr.length) return '—'
    const max = Math.max(...arr.map(k => k.kpIndex ?? 0))
    return <span style={{ ...s.badge, background: kpBg(max), color: kpColor(max) }}>Kp {max}</span>
  }
  if (col.key === 'is_potentially_hazardous') {
    return val
      ? <span style={{ ...s.badge, background: 'rgba(239,68,68,0.18)', color: '#fca5a5' }}>YES</span>
      : <span style={{ ...s.badge, background: 'rgba(34,197,94,0.14)', color: '#86efac' }}>NO</span>
  }
  if (col.key === 'miss_distance_miles') {
    const n = parseFloat(val)
    return isNaN(n) ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  if (col.key === 'velocity_mph') {
    const n = parseFloat(val)
    return isNaN(n) ? '—' : n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  if (col.key === 'estimated_diameter_min') {
    const n = parseFloat(val)
    return isNaN(n) ? '—' : n.toFixed(3)
  }
  return val ?? '—'
}

function kpBg(kp)    { return kp >= 8 ? 'rgba(168,85,247,0.18)' : kp >= 7 ? 'rgba(239,68,68,0.18)' : kp >= 5 ? 'rgba(245,158,11,0.16)' : 'rgba(34,197,94,0.14)' }
function kpColor(kp) { return kp >= 8 ? '#d8b4fe' : kp >= 7 ? '#fca5a5' : kp >= 5 ? '#fcd34d' : '#86efac' }

function rowKey(tab, row) {
  if (tab === 'flares')  return row.flr_id   ?? row.begin_time
  if (tab === 'cme')     return row.activity_id
  if (tab === 'storms')  return row.gst_id
  if (tab === 'neo')     return row.neo_id    ?? row.name
  return JSON.stringify(row)
}

export default function WeatherControl() {
  const { selectedFlares, setSelectedFlares, selectedCME, setSelectedCME,
          selectedStorms, setSelectedStorms, selectedNEO, setSelectedNEO } = useWeather()

  const [activeTab, setActiveTab] = useState('flares')
  const [date,      setDate]      = useState(today())
  const [allData,   setAllData]   = useState({})
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')

  const setterFor = { flares: setSelectedFlares, cme: setSelectedCME, storms: setSelectedStorms, neo: setSelectedNEO }
  const selectedFor = { flares: selectedFlares, cme: selectedCME, storms: selectedStorms, neo: selectedNEO }

  const tab = TABS.find(t => t.key === activeTab)

  // Fetch data whenever tab changes (cache per tab)
  useEffect(() => {
    if (allData[activeTab]) return
    setLoading(true)
    setError('')
    fetch(tab.endpoint)
      .then(r => r.json())
      .then(d => setAllData(prev => ({ ...prev, [activeTab]: d.rows ?? d })))
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false))
  }, [activeTab])

  // Filter by selected date
  const rows = useMemo(() => {
    const raw = allData[activeTab] ?? []
    if (!date) return raw
    return raw.filter(row => {
      const val = row[tab.dateField]
      return val && String(val).startsWith(date)
    })
  }, [allData, activeTab, date])

  const selected    = selectedFor[activeTab]
  const setSelected = setterFor[activeTab]

  const selectedKeys = useMemo(() => new Set(selected.map(r => rowKey(activeTab, r))), [selected, activeTab])

  function toggleRow(row) {
    const key = rowKey(activeTab, row)
    setSelected(prev =>
      selectedKeys.has(key)
        ? prev.filter(r => rowKey(activeTab, r) !== key)
        : [...prev, row]
    )
  }

  function toggleAll() {
    if (rows.every(r => selectedKeys.has(rowKey(activeTab, r)))) {
      setSelected(prev => prev.filter(r => !rows.some(row => rowKey(activeTab, row) === rowKey(activeTab, r))))
    } else {
      const newKeys = new Set(rows.map(r => rowKey(activeTab, r)))
      setSelected(prev => [...prev.filter(r => !newKeys.has(rowKey(activeTab, r))), ...rows])
    }
  }

  const allChecked = rows.length > 0 && rows.every(r => selectedKeys.has(rowKey(activeTab, r)))
  const totalSelected = selectedFlares.length + selectedCME.length + selectedStorms.length + selectedNEO.length

  const cols = COLUMNS[activeTab]

  return (
    <div style={s.page}>
      <div style={s.scanOverlay} />
      <div style={s.container}>

        {/* Header */}
        <header style={s.header}>
          <p style={s.eyebrow}>SPACE WEATHER / SCENE CONTROL</p>
          <h1 style={s.title}>Weather Visualisation</h1>
          <p style={s.subtitle}>
            Select weather events to render in the 3D scene. Positions are derived from
            source data — heliographic coordinates for solar events, miss distance for NEOs.
          </p>
        </header>

        {/* Selection summary */}
        <div style={s.summaryBar}>
          {[
            { label: 'Solar Flares',  count: selectedFlares.length,  color: '#fbbf24' },
            { label: 'CME',           count: selectedCME.length,     color: '#60a5fa' },
            { label: 'Geomag Storms', count: selectedStorms.length,  color: '#a78bfa' },
            { label: 'NEO',           count: selectedNEO.length,     color: '#34d399' },
          ].map(({ label, count, color }) => (
            <div key={label} style={s.summaryChip}>
              <span style={{ ...s.summaryDot, background: color }} />
              <span style={s.summaryLabel}>{label}</span>
              <span style={{ ...s.summaryCount, color }}>{count}</span>
            </div>
          ))}
          <span style={s.summaryTotal}>{totalSelected} total selected</span>
          {totalSelected > 0 && (
            <button
              style={s.clearBtn}
              onClick={() => { setSelectedFlares([]); setSelectedCME([]); setSelectedStorms([]); setSelectedNEO([]) }}
            >
              Clear All
            </button>
          )}
        </div>

        {/* Tab bar + date picker */}
        <div style={s.controls}>
          <div style={s.tabs}>
            {TABS.map(t => (
              <button
                key={t.key}
                style={{ ...s.tabBtn, ...(activeTab === t.key ? s.tabBtnActive : {}) }}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
                {selectedFor[t.key].length > 0 && (
                  <span style={s.tabCount}>{selectedFor[t.key].length}</span>
                )}
              </button>
            ))}
          </div>
          <div style={s.datePicker}>
            <label style={s.dateLabel}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={s.dateInput}
            />
            <button style={s.clearDateBtn} onClick={() => setDate('')}>All dates</button>
          </div>
        </div>

        {/* Table */}
        <div style={s.panel}>
          {loading && <div style={s.msg}>Loading…</div>}
          {error && <div style={{ ...s.msg, color: '#fca5a5' }}>{error}</div>}
          {!loading && !error && rows.length === 0 && (
            <div style={s.msg}>No events found for this date.</div>
          )}
          {!loading && !error && rows.length > 0 && (
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={{ ...s.th, width: 36 }}>
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} style={s.checkbox} />
                    </th>
                    {cols.map(c => <th key={c.key} style={s.th}>{c.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => {
                    const key     = rowKey(activeTab, row)
                    const checked = selectedKeys.has(key)
                    return (
                      <tr
                        key={key ?? i}
                        style={{ ...s.tr, ...(checked ? s.trSelected : {}) }}
                        onClick={() => toggleRow(row)}
                      >
                        <td style={s.td}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRow(row)}
                            onClick={e => e.stopPropagation()}
                            style={s.checkbox}
                          />
                        </td>
                        {cols.map(c => (
                          <td key={c.key} style={s.td}>{renderCell(c, row)}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <p style={s.hint}>
          Navigate to <strong style={{ color: '#7dd3fc' }}>Home</strong> to see selected events rendered in the 3D scene.
          {activeTab === 'neo' && ' NEO objects are placed near Earth scaled by miss distance.'}
          {(activeTab === 'flares' || activeTab === 'cme') && ' Events with a source location are positioned using heliographic coordinates.'}
        </p>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    background: 'radial-gradient(circle at top, #102948 0%, #08111f 35%, #050b14 100%)',
    color: '#e6eef8', position: 'relative', overflowX: 'hidden',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
  },
  scanOverlay: {
    position: 'absolute', inset: 0, pointerEvents: 'none',
    background: 'linear-gradient(to bottom, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.015) 100%)',
    opacity: 0.35,
  },
  container: { position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto', padding: '32px 24px 48px' },
  header: { marginBottom: '24px' },
  eyebrow: { margin: 0, color: '#7dd3fc', fontSize: '12px', letterSpacing: '0.18em', fontWeight: 700 },
  title: { margin: '8px 0 10px', fontSize: '38px', lineHeight: 1.05, fontWeight: 800, color: '#f8fbff' },
  subtitle: { margin: 0, maxWidth: '760px', color: '#94a3b8', fontSize: '15px', lineHeight: 1.6 },
  summaryBar: {
    display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
    padding: '14px 18px', marginBottom: '20px',
    background: 'rgba(10,18,32,0.82)', border: '1px solid rgba(125,211,252,0.12)',
    borderRadius: '14px', backdropFilter: 'blur(8px)',
  },
  summaryChip: { display: 'flex', alignItems: 'center', gap: '7px' },
  summaryDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  summaryLabel: { fontSize: '13px', color: '#94a3b8' },
  summaryCount: { fontSize: '15px', fontWeight: 700 },
  summaryTotal: { marginLeft: 'auto', fontSize: '13px', color: '#64748b' },
  clearBtn: {
    padding: '5px 12px', borderRadius: '6px', background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5',
    fontSize: '12px', cursor: 'pointer',
  },
  controls: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' },
  tabs: { display: 'flex', gap: '6px', flexWrap: 'wrap' },
  tabBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    padding: '8px 16px', borderRadius: '8px', cursor: 'pointer',
    background: 'rgba(10,18,32,0.6)', border: '1px solid rgba(148,163,184,0.15)',
    color: '#94a3b8', fontSize: '13px', fontWeight: 600,
    transition: 'border-color 0.2s, color 0.2s',
  },
  tabBtnActive: { border: '1px solid rgba(125,211,252,0.45)', color: '#7dd3fc', background: 'rgba(14,116,144,0.15)' },
  tabCount: {
    padding: '1px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
    background: 'rgba(125,211,252,0.15)', color: '#7dd3fc',
  },
  datePicker: { display: 'flex', alignItems: 'center', gap: '10px' },
  dateLabel: { fontSize: '13px', color: '#94a3b8' },
  dateInput: {
    background: 'rgba(10,18,32,0.8)', border: '1px solid rgba(148,163,184,0.2)',
    borderRadius: '8px', color: '#e2e8f0', padding: '7px 10px', fontSize: '13px',
    outline: 'none', colorScheme: 'dark',
  },
  clearDateBtn: {
    padding: '7px 12px', borderRadius: '8px', background: 'transparent',
    border: '1px solid rgba(148,163,184,0.2)', color: '#64748b',
    fontSize: '12px', cursor: 'pointer',
  },
  panel: {
    background: 'rgba(7,14,26,0.86)', border: '1px solid rgba(148,163,184,0.12)',
    borderRadius: '20px', overflow: 'hidden',
    boxShadow: '0 16px 40px rgba(0,0,0,0.28)', backdropFilter: 'blur(8px)',
  },
  msg: { padding: '28px 20px', color: '#94a3b8', fontSize: '14px' },
  tableWrap: { width: '100%', overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '700px' },
  th: {
    textAlign: 'left', padding: '12px 14px', fontSize: '11px', textTransform: 'uppercase',
    letterSpacing: '0.08em', color: '#94a3b8', borderBottom: '1px solid rgba(148,163,184,0.12)',
    background: 'rgba(15,23,42,0.72)', userSelect: 'none',
  },
  tr: { borderBottom: '1px solid rgba(148,163,184,0.07)', cursor: 'pointer', transition: 'background 0.12s' },
  trSelected: { background: 'rgba(14,116,144,0.14)' },
  td: { padding: '13px 14px', fontSize: '13px', color: '#e2e8f0', verticalAlign: 'middle' },
  checkbox: { width: '15px', height: '15px', cursor: 'pointer', accentColor: '#7dd3fc' },
  badge: {
    display: 'inline-flex', alignItems: 'center', padding: '3px 8px',
    borderRadius: '999px', fontSize: '11px', fontWeight: 700,
  },
  link: { color: '#7dd3fc', textDecoration: 'none', fontWeight: 600 },
  hint: { marginTop: '16px', fontSize: '13px', color: '#64748b', lineHeight: 1.6 },
}
