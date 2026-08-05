import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import RawDataModal from './RawDataModal.jsx'
import { useWeather } from './WeatherContext.jsx'
import WeatherWidget from './WeatherWidget.jsx'
import './SpaceHome.css'

//  Planet definitions

// Lunar phase reference:(same reference as DailyEvents)
// Synodic period is 29.53 days — determines the visible phase cycle
const KNOWN_NEW_MOON_MS      = new Date('2000-01-06T00:00:00Z').getTime()
const LUNAR_SYNODIC_PERIOD_MS = 29.53058867 * 86400000

// Meeus mean-longitude coefficients (Table 31.a) — same as the backend uses.
// Each entry: [L0 degrees, L1 degrees per Julian century]
const MEAN_LONGITUDE_COEFFICIENTS = {
  Mercury: [252.250906, 149474.0722491],
  Venus:   [181.979801,  58519.2130302],
  Earth:   [100.466457,  36000.7698278],
  Mars:    [355.433275,  19141.6964746],
  Jupiter: [ 34.351519,   3034.9056606],
  Saturn:  [ 50.077444,   1222.1138488],
  Uranus:  [314.055005,    429.8640561],
  Neptune: [304.348665,    219.8833092],
}

// J2000.0 epoch: 2000-Jan-1 12:00:00 TT ≈ 2000-Jan-1 11:58:56 UTC
const J2000_UNIX_MS = 946727935816

function getMeanLongitudeRad(planetName, nowMs) {
  const T = (nowMs - J2000_UNIX_MS) / (36525 * 86400 * 1000)  // Julian centuries since J2000
  const [L0, L1] = MEAN_LONGITUDE_COEFFICIENTS[planetName]
  return ((L0 + L1 * T) % 360) * (Math.PI / 180)
}

const PLANET_DEFINITIONS = [
  { name: 'Mercury', radius: 0.18, distance: 4.5,  orbitalPeriod:    87.97, rotationPeriod:   58.646, axialTilt:   0.034, color: '#b5b5b5', texture: '/textures/mercury.jpg' },
  { name: 'Venus',   radius: 0.45, distance: 6.5,  orbitalPeriod:   224.70, rotationPeriod: -243.022, axialTilt: 177.36,  color: '#e8cda0', texture: '/textures/venus.jpg' },
  { name: 'Earth',   radius: 0.48, distance: 9.0,  orbitalPeriod:   365.25, rotationPeriod:    0.997, axialTilt:  23.44,  color: '#2a6bbf', texture: '/textures/earth.jpg',   hasMoon: true },
  { name: 'Mars',    radius: 0.26, distance: 12.0, orbitalPeriod:   686.97, rotationPeriod:    1.026, axialTilt:  25.19,  color: '#c1440e', texture: '/textures/mars.jpg' },
  { name: 'Jupiter', radius: 1.20, distance: 17.0, orbitalPeriod:  4332.59, rotationPeriod:    0.414, axialTilt:   3.13,  color: '#c88b3a', texture: '/textures/jupiter.jpg' },
  { name: 'Saturn',  radius: 1.00, distance: 22.5, orbitalPeriod: 10759.22, rotationPeriod:    0.444, axialTilt:  26.73,  color: '#e4d191', texture: '/textures/saturn.jpg',  hasRing: true },
  { name: 'Uranus',  radius: 0.70, distance: 27.5, orbitalPeriod: 30685.40, rotationPeriod:   -0.718, axialTilt:  97.77,  color: '#7de8e8', texture: '/textures/uranus.jpg' },
  { name: 'Neptune', radius: 0.65, distance: 32.0, orbitalPeriod: 60190.03, rotationPeriod:    0.671, axialTilt:  28.32,  color: '#3f54ba', texture: '/textures/neptune.jpg' },
]

//  Severity helpers

function getSolarFlareSeverity(classType) {
  if (!classType) return 'low'
  const firstChar = classType[0]?.toUpperCase()
  if (firstChar === 'X') return 'critical'
  if (firstChar === 'M') return 'high'
  if (firstChar === 'C') return 'medium'
  return 'low'
}

function getGeomagneticStormSeverity(kpIndex) {
  const kp = parseFloat(kpIndex)
  if (kp >= 8) return 'critical'
  if (kp >= 6) return 'high'
  if (kp >= 4) return 'medium'
  return 'low'
}

function getCoronalMassEjectionSeverity(speedKmPerSec) {
  const speed = parseFloat(speedKmPerSec)
  if (speed >= 2000) return 'critical'
  if (speed >= 1000) return 'high'
  if (speed >= 500)  return 'medium'
  return 'low'
}

const SEVERITY_DISPLAY_LABELS = {
  critical: 'CRITICAL',
  high:     'HIGH',
  medium:   'MODERATE',
  low:      'NOMINAL',
}

const AU_KM = 149597870

function getCmeSpeedKms(event) {
  const analyses = Array.isArray(event.cme_analyses)
    ? event.cme_analyses
    : (event.cme_analyses ? (() => { try { return JSON.parse(event.cme_analyses) } catch { return [] } })() : [])
  return analyses[0]?.speed || event.speed || 0
}

function detectCausalLinks(cmeRows, gstRows) {
  const windowMs = 36 * 3600000
  const results  = []

  cmeRows.forEach(cme => {
    const speed    = getCmeSpeedKms(cme)
    const cmeMs    = new Date(cme.start_time).getTime()
    if (!speed || !cmeMs || isNaN(cmeMs)) return

    const travelMs   = (AU_KM / speed) * 1000
    const expectedMs = cmeMs + travelMs

    gstRows.forEach(gst => {
      const gstMs = new Date(gst.start_time).getTime()
      if (!gstMs || isNaN(gstMs)) return
      const diff = Math.abs(gstMs - expectedMs)
      if (diff < windowMs) {
        results.push({
          cme, gst, speedKms: speed,
          travelHours:     travelMs / 3600000,
          expectedArrival: new Date(expectedMs),
          confidence:      Math.round((1 - diff / windowMs) * 100),
        })
      }
    })
  })

  return results.sort((a, b) => new Date(b.cme.start_time) - new Date(a.cme.start_time))
}

function buildTeardropGeo(sunDist, latDist, tailDist, segs = 28) {
  const geo = new THREE.SphereGeometry(1, segs, Math.floor(segs / 2))
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i++) {
    const nx = pos.getX(i), ny = pos.getY(i), nz = pos.getZ(i)
    pos.setXYZ(i,
      nx >= 0 ? nx * sunDist : nx * tailDist,
      ny * latDist,
      nz * latDist,
    )
  }
  pos.needsUpdate = true
  geo.computeVertexNormals()
  return geo
}

function quadraticBezierPoint(start, control, end, t) {
  const s = 1 - t
  return new THREE.Vector3(
    s * s * start.x + 2 * s * t * control.x + t * t * end.x,
    s * s * start.y + 2 * s * t * control.y + t * t * end.y,
    s * s * start.z + 2 * s * t * control.z + t * t * end.z,
  )
}

function formatShortDate(dt) {
  if (!dt) return '--'
  return new Date(dt).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function getPlaybackLabel(daysBack) {
  if (daysBack === 0) return 'TODAY'
  const d = new Date()
  d.setDate(d.getDate() - daysBack)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()
}

//  EventCard
function EventCard({ type, icon, items, loading, onItemClick }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className={`event-group ${isExpanded ? 'open' : ''}`}>
      <button className="event-group-header" onClick={() => setIsExpanded(prev => !prev)}>
        <span className="event-icon">{icon}</span>
        <span className="event-type-label">{type}</span>
        {!loading && <span className="event-count">{items.length}</span>}
        <span className="chevron">{isExpanded ? '▾' : '▸'}</span>
      </button>

      {isExpanded && (
        <div className="event-list">
          {loading && (
            <div className="event-loading">
              <span className="pulse-dot" />
              Fetching...
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="event-empty">No events today</div>
          )}

          {!loading && items.map((eventItem, index) => (
            <div
              key={index}
              className={`event-item sev-${eventItem.severity}${onItemClick ? ' event-item-clickable' : ''}`}
              onClick={() => onItemClick?.(eventItem)}
            >
              <div className="event-item-top">
                <span className={`sev-badge sev-${eventItem.severity}`}>
                  {SEVERITY_DISPLAY_LABELS[eventItem.severity]}
                </span>
                <span className="event-time">{eventItem.time}</span>
              </div>
              <div className="event-detail">{eventItem.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SpaceHome() {
  const canvasMountRef    = useRef(null)
  const animationFrameRef = useRef(null)

  const [solarFlareEvents,           setSolarFlareEvents]           = useState([])
  const [coronalMassEjectionEvents,  setCoronalMassEjectionEvents]  = useState([])
  const [geomagneticStormEvents,     setGeomagneticStormEvents]     = useState([])
  const [solarFlaresLoading,         setSolarFlaresLoading]         = useState(true)
  const [cmeLoading,                 setCmeLoading]                 = useState(true)
  const [geomagneticStormsLoading,   setGeomagneticStormsLoading]   = useState(true)
  const [currentUtcTime,             setCurrentUtcTime]             = useState('')
  const [hoveredPlanetName,          setHoveredPlanetName]          = useState(null)
  const [planetLongitudes,           setPlanetLongitudes]           = useState({})
  const [orbitSpeed,                 setOrbitSpeed]                 = useState(0)
  const [settingsOpen,               setSettingsOpen]               = useState(false)
  const [selected,                   setSelected]                   = useState(null)
  const [sidebarCollapsed,           setSidebarCollapsed]           = useState(false)
  const [sidebarMode,                setSidebarMode]                = useState('today')
  const [causalLinks,                setCausalLinks]                = useState([])
  const [allCmeRows,                 setAllCmeRows]                 = useState([])
  const [allGstRows,                 setAllGstRows]                 = useState([])
  const [historyDaysBack,            setHistoryDaysBack]            = useState(0)
  const [showMagnetosphere,          setShowMagnetosphere]          = useState(false)

  const orbitSpeedRef         = useRef(0)
  const showMagnetosphereRef  = useRef(false)
  const sceneRef            = useRef(null)
  const earthMeshRef        = useRef(null)
  const earthOrbitPivotRef  = useRef(null)
  const weatherEffectsRef   = useRef({ flares: [], shells: [], aurora: null, magnetosphere: null, neos: [] })

  const { selectedFlares, selectedCME, selectedStorms, selectedNEO } = useWeather()

  useEffect(() => { orbitSpeedRef.current = orbitSpeed }, [orbitSpeed])
  useEffect(() => { showMagnetosphereRef.current = showMagnetosphere }, [showMagnetosphere])

  //  UTC clock
  useEffect(() => {
    const updateClock = () => setCurrentUtcTime(new Date().toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }))
    updateClock()
    const clockIntervalId = setInterval(updateClock, 1000)
    return () => clearInterval(clockIntervalId)
  }, [])

  //  Ephemeris fetch
  useEffect(() => {
    fetch('/api/ephemeris')
      .then(r => r.json())
      .then(data => setPlanetLongitudes(data))
      .catch(() => {})
  }, [])

  //  Space weather API fetches
  useEffect(() => {
    const formatEventTimestamp = (isoString) =>
      isoString
        ? new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'UTC', timeZoneName: 'short',
          })
        : '--'

    const localDate = new Date().toLocaleDateString('en-CA')
    fetch(`http://localhost:8000/api/solar-flares/today?date=${localDate}`)
      .then(r => r.json())
      .then(d => {
        const rows = d.rows ?? []
        setSolarFlareEvents(
          rows.map(entry => ({
            severity: getSolarFlareSeverity(entry.class_type || entry.classType),
            time:     formatEventTimestamp(entry.begin_time),
            detail:   `Class ${entry.class_type || '?'} — ${entry.source_location || 'Unknown'}`,
            raw:      entry,
          }))
        )
      })
      .catch(() => setSolarFlareEvents([]))
      .finally(() => setSolarFlaresLoading(false))

    fetch(`http://localhost:8000/api/cme-events/today?date=${localDate}`)
      .then(r => r.json())
      .then(d => {
        const rows = d.rows ?? []
        setCoronalMassEjectionEvents(
          rows.map(entry => {
            const analyses = Array.isArray(entry.cme_analyses)
              ? entry.cme_analyses
              : (entry.cme_analyses ? JSON.parse(entry.cme_analyses) : [])
            const speedKmPerSec = analyses[0]?.speed || entry.speed || 0
            return {
              severity: getCoronalMassEjectionSeverity(speedKmPerSec),
              time:     formatEventTimestamp(entry.start_time),
              detail:   `Speed ${Math.round(speedKmPerSec)} km/s`,
              raw:      entry,
            }
          })
        )
      })
      .catch(() => setCoronalMassEjectionEvents([]))
      .finally(() => setCmeLoading(false))

    fetch(`http://localhost:8000/api/geomagnetic-storms/today?date=${localDate}`)
      .then(r => r.json())
      .then(d => {
        const rows = d.rows ?? []
        setGeomagneticStormEvents(
          rows.map(entry => {
            const kpArray = Array.isArray(entry.kp_index)
              ? entry.kp_index
              : (entry.kp_index ? JSON.parse(entry.kp_index) : [])
            const kpIndex = kpArray.length > 0 ? Math.max(...kpArray.map(k => k.kpIndex || 0)) : 0
            return {
              severity: getGeomagneticStormSeverity(kpIndex),
              time:     formatEventTimestamp(entry.start_time),
              detail:   `Kp ${kpIndex} — Geomagnetic storm`,
              raw:      entry,
            }
          })
        )
      })
      .catch(() => setGeomagneticStormEvents([]))
      .finally(() => setGeomagneticStormsLoading(false))
  }, [])

  //  Historical
  useEffect(() => {
    Promise.all([
      fetch('http://localhost:8000/api/cme').then(r => r.json()).catch(() => []),
      fetch('http://localhost:8000/api/gst').then(r => r.json()).catch(() => []),
    ]).then(([cme, gst]) => {
      const cmeRows = Array.isArray(cme) ? cme : []
      const gstRows = Array.isArray(gst) ? gst : []
      setAllCmeRows(cmeRows)
      setAllGstRows(gstRows)
      setCausalLinks(detectCausalLinks(cmeRows, gstRows))
    })
  }, [])

  //  Three.js orrery
  useEffect(() => {
    const mountElement = canvasMountRef.current
    if (!mountElement) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mountElement.clientWidth, mountElement.clientHeight)
    mountElement.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    sceneRef.current = scene
    const camera = new THREE.PerspectiveCamera(55, mountElement.clientWidth / mountElement.clientHeight, 0.1, 1000)

    //  Spherical camera state
    const orbitTarget     = new THREE.Vector3(0, 0, 0)
    const cameraSpherical = new THREE.Spherical()

    const MIN_POLAR_ANGLE = 0.08
    const MAX_POLAR_ANGLE = Math.PI - 0.08
    const MIN_ZOOM_RADIUS = 1.0
    const MAX_ZOOM_RADIUS = 140

    const cameraTransition = {
      active:       false,
      targetCenter: new THREE.Vector3(),
      targetRadius: 0,
    }

    let focusedPlanetObject = null
    let focusedOrbitRadius  = 0

    const syncSphericalFromCamera = () => {
      cameraSpherical.setFromVector3(camera.position.clone().sub(orbitTarget))
    }

    const applyCameraSpherical = () => {
      cameraSpherical.phi    = Math.max(MIN_POLAR_ANGLE, Math.min(MAX_POLAR_ANGLE, cameraSpherical.phi))
      cameraSpherical.radius = Math.max(MIN_ZOOM_RADIUS, Math.min(MAX_ZOOM_RADIUS, cameraSpherical.radius))
      cameraSpherical.makeSafe()
      camera.position.setFromSpherical(cameraSpherical).add(orbitTarget)
      camera.lookAt(orbitTarget)
    }

    camera.position.set(18, 38, 52)
    camera.lookAt(orbitTarget)
    syncSphericalFromCamera()

    //  Starfield
    const starPositionBuffer = new Float32Array(6000 * 3)
    for (let i = 0; i < starPositionBuffer.length; i++) {
      starPositionBuffer[i] = (Math.random() - 0.5) * 700
    }
    const starGeometry = new THREE.BufferGeometry()
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositionBuffer, 3))
    scene.add(new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.28, sizeAttenuation: true })
    ))

    const textureLoader = new THREE.TextureLoader()

    //  Sun
    const sunTexture = textureLoader.load('/textures/sun.jpg')
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 64, 64),
      new THREE.MeshStandardMaterial({
        map: sunTexture,
        emissive: 0xff6600,
        emissiveIntensity: 1.2,
        emissiveMap: sunTexture,
        roughness: 0.4,
      })
    )
    scene.add(sunMesh)

    // Corona glow
    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = glowCanvas.height = 256
    const glowCtx = glowCanvas.getContext('2d')
    const glowGradient = glowCtx.createRadialGradient(128, 128, 10, 128, 128, 128)
    glowGradient.addColorStop(0,   'rgba(255,210,0,0.5)')
    glowGradient.addColorStop(0.3, 'rgba(255,120,0,0.2)')
    glowGradient.addColorStop(1,   'rgba(255,80,0,0)')
    glowCtx.fillStyle = glowGradient
    glowCtx.fillRect(0, 0, 256, 256)
    const coronaGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(glowCanvas),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }))
    coronaGlowSprite.scale.set(14, 14, 1)
    scene.add(coronaGlowSprite)

    scene.add(new THREE.PointLight(0xfff5cc, 3.5, 300))
    scene.add(new THREE.AmbientLight(0x223355, 2.2))
    const cameraFillLight = new THREE.DirectionalLight(0x8899bb, 0.8)
    cameraFillLight.position.set(18, 38, 52)
    scene.add(cameraFillLight)

    const planetSceneObjects = []

    PLANET_DEFINITIONS.forEach((planetDef, index) => {
      const orbitRing = new THREE.Mesh(
        new THREE.RingGeometry(planetDef.distance - 0.04, planetDef.distance + 0.04, 128),
        new THREE.MeshBasicMaterial({ color: 0x334466, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
      )
      orbitRing.rotation.x = -Math.PI / 2
      scene.add(orbitRing)

      const planetMesh = new THREE.Mesh(
        new THREE.SphereGeometry(planetDef.radius, 48, 48),
        new THREE.MeshStandardMaterial({
          map:       textureLoader.load(planetDef.texture),
          roughness: planetDef.name === 'Earth' ? 0.6 : 0.85,
          metalness: planetDef.name === 'Earth' ? 0.1 : 0,
        })
      )
      planetMesh.rotation.z = planetDef.axialTilt * Math.PI / 180

      const orbitPivot = new THREE.Object3D()
      orbitPivot.add(planetMesh)
      planetMesh.position.set(planetDef.distance, 0, 0)
      scene.add(orbitPivot)

      if (planetDef.name === 'Earth') earthOrbitPivotRef.current = orbitPivot

      // Saturn rings
      let saturnRingMesh = null
      if (planetDef.hasRing) {
        const ringParent = new THREE.Object3D()
        ringParent.rotation.z = 0.47
        ringParent.position.set(planetDef.distance, 0, 0)
        orbitPivot.add(ringParent)

        const ringBands = [
          [1.12, 1.24, 0x8a7a62, 0.25],
          [1.24, 1.30, 0x1a1510, 0.90],
          [1.30, 1.55, 0xb09878, 0.80],
          [1.55, 1.65, 0xc8aa88, 0.90],
          [1.65, 1.75, 0xb89878, 0.85],
          [1.75, 1.85, 0x080604, 0.97],
          [1.85, 2.00, 0xa08868, 0.78],
          [2.00, 2.10, 0x080604, 0.92],
          [2.10, 2.25, 0x988060, 0.72],
          [2.30, 2.35, 0x706050, 0.45],
        ]

        ringBands.forEach(([inner, outer, color, opacity]) => {
          const band = new THREE.Mesh(
            new THREE.RingGeometry(planetDef.radius * inner, planetDef.radius * outer, 160),
            new THREE.MeshBasicMaterial({
              color, side: THREE.DoubleSide, transparent: true, opacity, depthWrite: false,
            })
          )
          band.rotation.x = -Math.PI / 2
          ringParent.add(band)
        })

        saturnRingMesh = ringParent
      }

      if (planetDef.hasMoon) {
        const moonMesh = new THREE.Mesh(
          new THREE.SphereGeometry(0.12, 24, 24),
          new THREE.MeshStandardMaterial({ map: textureLoader.load('/textures/moon.jpg'), roughness: 0.9 })
        )
        const moonOrbitPivot = new THREE.Object3D()
        moonOrbitPivot.add(moonMesh)
        moonMesh.position.set(0.8, 0, 0)
        moonOrbitPivot.position.set(planetDef.distance, 0, 0)
        orbitPivot.add(moonOrbitPivot)
        planetSceneObjects.push({
          mesh: planetMesh, pivot: orbitPivot,
          moonPivot: moonOrbitPivot, ringMesh: saturnRingMesh,
          orbitalPeriod: planetDef.orbitalPeriod, rotationPeriod: planetDef.rotationPeriod,
          initialAngle: planetLongitudes[planetDef.name] ?? index * 0.8,
          name: planetDef.name, radius: planetDef.radius,
        })
        return
      }

      planetSceneObjects.push({
        mesh: planetMesh, pivot: orbitPivot, ringMesh: saturnRingMesh,
        orbitalPeriod: planetDef.orbitalPeriod, rotationPeriod: planetDef.rotationPeriod,
        initialAngle: planetLongitudes[planetDef.name] ?? index * 0.8,
        name: planetDef.name, radius: planetDef.radius,
      })
    })

    earthMeshRef.current = planetSceneObjects.find(p => p.name === 'Earth')?.mesh ?? null

    const raycaster         = new THREE.Raycaster()
    const mouseNdc          = new THREE.Vector2()
    const hoverTargetMeshes = planetSceneObjects.map(p => p.mesh)

    let isPanning  = false
    let isOrbiting = false
    let prevMouseX = 0
    let prevMouseY = 0
    let mouseDownX = 0
    let mouseDownY = 0

    const PAN_SPEED_FACTOR        = 0.022
    const ORBIT_SPEED_FACTOR      = 0.005
    const CLICK_DRAG_THRESHOLD_PX = 4

    const handlePanDelta = (deltaX, deltaY) => {
      const distanceScale = cameraSpherical.radius * PAN_SPEED_FACTOR * 0.04
      const rightDir = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
      const upDir    = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
      const panDelta = new THREE.Vector3()
        .addScaledVector(rightDir, -deltaX * distanceScale)
        .addScaledVector(upDir,     deltaY * distanceScale)
      orbitTarget.add(panDelta)
      camera.position.add(panDelta)
      camera.lookAt(orbitTarget)
    }

    const handleOrbitDelta = (deltaX, deltaY) => {
      cameraSpherical.theta -= deltaX * ORBIT_SPEED_FACTOR
      cameraSpherical.phi   -= deltaY * ORBIT_SPEED_FACTOR
      applyCameraSpherical()
    }

    //  Scroll zoom
    const onWheel = (e) => {
      e.preventDefault()

      const ZOOM_STEP_FACTOR = 0.12
      const zoomMultiplier   = e.deltaY > 0 ? (1 + ZOOM_STEP_FACTOR) : (1 - ZOOM_STEP_FACTOR)

      if (focusedPlanetObject) {
        focusedOrbitRadius = Math.max(
          MIN_ZOOM_RADIUS,
          Math.min(MAX_ZOOM_RADIUS, focusedOrbitRadius * zoomMultiplier)
        )
        cameraTransition.targetRadius = focusedOrbitRadius
      } else {
        cameraTransition.active = false
        cameraSpherical.radius  = Math.max(
          MIN_ZOOM_RADIUS,
          Math.min(MAX_ZOOM_RADIUS, cameraSpherical.radius * zoomMultiplier)
        )
        applyCameraSpherical()
      }
    }

    const onMouseDown = (e) => {
      prevMouseX = mouseDownX = e.clientX
      prevMouseY = mouseDownY = e.clientY

      if (e.button === 0) {
        isPanning = true
        focusedPlanetObject = null
        mountElement.style.cursor = 'move'
        return
      }

      if (e.button === 1 || e.button === 2) {
        if (e.button === 1) e.preventDefault()
        isOrbiting = true
        mountElement.style.cursor = 'crosshair'
      }
    }

    const onMouseUp = (e) => {
      if (e.button === 0) {
        isPanning = false

        const dragDistancePx = Math.hypot(
          e.clientX - mouseDownX,
          e.clientY - mouseDownY
        )
        const wasClick = dragDistancePx <= CLICK_DRAG_THRESHOLD_PX

        if (wasClick) {
          const rect = mountElement.getBoundingClientRect()
          mouseNdc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
          mouseNdc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
          raycaster.setFromCamera(mouseNdc, camera)
          const intersections = raycaster.intersectObjects(hoverTargetMeshes)

          if (intersections.length > 0) {
            const hitPlanet = planetSceneObjects.find(p => p.mesh === intersections[0].object)
            if (hitPlanet) {
              focusedPlanetObject = hitPlanet
              focusedOrbitRadius  = hitPlanet.radius * 6
              const planetWorldPos = new THREE.Vector3()
              hitPlanet.mesh.getWorldPosition(planetWorldPos)
              cameraTransition.targetCenter.copy(planetWorldPos)
              cameraTransition.targetRadius = focusedOrbitRadius
              cameraTransition.active = true
            }
          }
        }
      }

      if (e.button === 1 || e.button === 2) isOrbiting = false
      if (!isPanning && !isOrbiting) mountElement.style.cursor = 'default'
    }

    const onMouseLeave = () => {
      isPanning = isOrbiting = false
      mountElement.style.cursor = 'default'
    }

    const onContextMenu = (e) => e.preventDefault()

    const onMouseMove = (e) => {
      const deltaX = e.clientX - prevMouseX
      const deltaY = e.clientY - prevMouseY
      prevMouseX = e.clientX
      prevMouseY = e.clientY

      if (isPanning)  { handlePanDelta(deltaX, deltaY);   return }
      if (isOrbiting) { handleOrbitDelta(deltaX, deltaY); return }

      const rect = mountElement.getBoundingClientRect()
      mouseNdc.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1
      mouseNdc.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1
      raycaster.setFromCamera(mouseNdc, camera)
      const intersections = raycaster.intersectObjects(hoverTargetMeshes)
      if (intersections.length > 0) {
        const hitName = planetSceneObjects.find(p => p.mesh === intersections[0].object)?.name || null
        setHoveredPlanetName(hitName)
        mountElement.style.cursor = 'pointer'
      } else {
        setHoveredPlanetName(null)
        mountElement.style.cursor = 'default'
      }
    }

    mountElement.addEventListener('mousedown',   onMouseDown)
    mountElement.addEventListener('mouseup',     onMouseUp)
    mountElement.addEventListener('mouseleave',  onMouseLeave)
    mountElement.addEventListener('wheel',       onWheel,      { passive: false })
    mountElement.addEventListener('mousemove',   onMouseMove)
    mountElement.addEventListener('contextmenu', onContextMenu)
    mountElement.style.cursor = 'default'

    const TRANSITION_LERP_SPEED   = 0.08
    const TRANSITION_DONE_EPSILON = 0.01

    const clock = new THREE.Clock()
    let prevElapsed    = 0
    let spinOffsetDays = 0   // properly integrated spin offset; avoids jumps on speed change
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate)
      const elapsedSeconds = clock.getElapsedTime()
      const dt             = elapsedSeconds - prevElapsed
      prevElapsed          = elapsedSeconds

      const TWO_PI = Math.PI * 2
      const nowMs  = Date.now()
      const nowDays = nowMs / 86400000

      // Accumulate spin offset at current speed (dt × speed, not elapsed × speed)
      // speed=0 means Real Time — advance spin at 1/86400 day per real second
      spinOffsetDays += dt * (orbitSpeedRef.current > 0 ? orbitSpeedRef.current : 1 / 86400)

      sunMesh.rotation.y = nowDays * (TWO_PI / 25.38)
      coronaGlowSprite.material.opacity = 0.7 + 0.08 * Math.sin(elapsedSeconds * 1.5)

      const simOffsetMs = elapsedSeconds * orbitSpeedRef.current * 86400000
      const spinDays    = nowDays + spinOffsetDays

      planetSceneObjects.forEach(planetObj => {
        planetObj.pivot.rotation.y = getMeanLongitudeRad(planetObj.name, nowMs + simOffsetMs)
        planetObj.mesh.rotation.y  = spinDays * (TWO_PI / Math.abs(planetObj.rotationPeriod)) * Math.sign(planetObj.rotationPeriod)
        if (planetObj.moonPivot) {
          const moonPhaseAngle = ((nowMs + simOffsetMs - KNOWN_NEW_MOON_MS) / LUNAR_SYNODIC_PERIOD_MS) * TWO_PI
          planetObj.moonPivot.rotation.y = moonPhaseAngle
        }
      })

      const wx = weatherEffectsRef.current
      wx.shells.forEach(s => {
        s.progress = (s.progress + s.speed) % 1
        const scale = 2.5 + s.progress * s.range
        s.mesh.scale.setScalar(scale)
        s.mesh.material.opacity = s.maxOpacity * (1 - s.progress * 0.95)
        if (s.arrow) s.arrow.position.setScalar(0)
      })

      if (wx.neos.length > 0 && earthMeshRef.current) {
        const earthWorldPos = new THREE.Vector3()
        earthMeshRef.current.getWorldPosition(earthWorldPos)
        wx.neos.forEach(n => {
          n.progress = (n.progress + n.speed) % 1
          const start   = earthWorldPos.clone().add(n.startOffset)
          const control = earthWorldPos.clone().add(n.controlOffset)
          const end     = earthWorldPos.clone().add(n.endOffset)
          n.group.position.copy(quadraticBezierPoint(start, control, end, n.progress))
          n.body.rotation.x += 0.018
          n.body.rotation.y += 0.013
          const trailPts = []
          for (let i = 0; i < 24; i++) {
            trailPts.push(quadraticBezierPoint(start, control, end, Math.max(n.progress - i * 0.014, 0)))
          }
          n.trail.geometry.dispose()
          n.trail.geometry = new THREE.BufferGeometry().setFromPoints(trailPts)
        })
      }

      if (wx.magnetosphere) wx.magnetosphere.visible = showMagnetosphereRef.current

      if (wx.magnetosphere && showMagnetosphereRef.current && earthMeshRef.current) {
        const earthWorldPos = new THREE.Vector3()
        earthMeshRef.current.getWorldPosition(earthWorldPos)
        wx.magnetosphere.position.copy(earthWorldPos)

        // Keep tail pointed anti-sunward as Earth orbits
        const sunwardDir = earthWorldPos.clone().negate().normalize()
        if (sunwardDir.lengthSq() > 0.0001) {
          wx.magnetosphere.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), sunwardDir)
        }

        const ud = wx.magnetosphere.userData
        if (ud.fieldLines) {
          // Detect CME shells crossing Earth's orbital distance (~9 scene units).
          // Shell radius = 2.5 + progress × range; Earth is ~9 units from the Sun.
          const EARTH_DIST    = 9.0
          const IMPACT_WINDOW = 4.2
          let maxImpact = 0
          wx.shells.forEach(s => {
            const shellR = 2.5 + s.progress * s.range
            maxImpact = Math.max(maxImpact, Math.max(0, 1 - Math.abs(shellR - EARTH_DIST) / IMPACT_WINDOW))
          })

          ud.compressionAnim += (maxImpact - ud.compressionAnim) * 0.04
          const cmp = ud.compressionAnim

          // Deformation parameters: sunward boundary pushed in, tail extends, flanks bulge
          const sunFactor  = 1 - cmp * 0.44
          const tailFactor = ud.TAIL_R * (1 + cmp * 0.08)
          const latFactor  = 1 + cmp * 0.15

          ud.fieldLines.forEach(({ geo, prescale, positions, cr, cg, cb, opacity }, idx) => {
            // Per-line colour: shift warm colours toward red, cool colours toward orange
            const child = wx.magnetosphere.children[idx]
            if (child?.isLine) {
              child.material.color.setRGB(
                Math.min(1, cr + (1.0 - cr) * cmp * 0.72),
                Math.max(0, cg * (1 - cmp * 0.55)),
                Math.max(0, cb * (1 - cmp * 0.92)),
              )
              child.material.opacity = opacity + cmp * 0.24
            }

            // Rewrite vertex positions only when CME is active (or one frame after to reset)
            if (cmp > 0.003 || ud._lastCmp > 0.003) {
              const n = prescale.length / 3
              for (let i = 0; i < n; i++) {
                const px = prescale[i * 3]
                const py = prescale[i * 3 + 1]
                const pz = prescale[i * 3 + 2]
                positions[i * 3]     = px * (px >= 0 ? sunFactor : tailFactor)
                positions[i * 3 + 1] = py * latFactor
                positions[i * 3 + 2] = pz * latFactor
              }
              geo.attributes.position.needsUpdate = true
            }
          })
          ud._lastCmp = cmp

          // Bow-shock glow: flickers at the sunward face during impact
          if (ud.impactDisc?.material) {
            ud.impactDisc.material.opacity = cmp * 0.55 * (0.78 + 0.22 * Math.sin(elapsedSeconds * 7.8))
          }
        }
      }

      if (focusedPlanetObject) {
        focusedPlanetObject.mesh.getWorldPosition(cameraTransition.targetCenter)
        cameraTransition.targetRadius = focusedOrbitRadius

        if (!cameraTransition.active) {
          orbitTarget.copy(cameraTransition.targetCenter)
          applyCameraSpherical()
        }
      }

      if (cameraTransition.active) {
        orbitTarget.lerp(cameraTransition.targetCenter, TRANSITION_LERP_SPEED)
        cameraSpherical.radius += (cameraTransition.targetRadius - cameraSpherical.radius) * TRANSITION_LERP_SPEED
        applyCameraSpherical()

        const centerDone = orbitTarget.distanceTo(cameraTransition.targetCenter) < TRANSITION_DONE_EPSILON
        const radiusDone = Math.abs(cameraSpherical.radius - cameraTransition.targetRadius) < TRANSITION_DONE_EPSILON
        if (centerDone && radiusDone) {
          cameraTransition.active = false
          syncSphericalFromCamera()
        }
      }

      renderer.render(scene, camera)
    }
    animate()

    const onWindowResize = () => {
      camera.aspect = mountElement.clientWidth / mountElement.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mountElement.clientWidth, mountElement.clientHeight)
    }
    window.addEventListener('resize', onWindowResize)

    return () => {
      cancelAnimationFrame(animationFrameRef.current)
      window.removeEventListener('resize', onWindowResize)
      mountElement.removeEventListener('mousedown',   onMouseDown)
      mountElement.removeEventListener('mouseup',     onMouseUp)
      mountElement.removeEventListener('mouseleave',  onMouseLeave)
      mountElement.removeEventListener('wheel',       onWheel)
      mountElement.removeEventListener('mousemove',   onMouseMove)
      mountElement.removeEventListener('contextmenu', onContextMenu)
      renderer.dispose()
      if (renderer.domElement.parentNode === mountElement) mountElement.removeChild(renderer.domElement)
    }
  }, [planetLongitudes])

  useEffect(() => {
    const scene     = sceneRef.current
    const earthMesh = earthMeshRef.current
    if (!scene) return

    const old = weatherEffectsRef.current
    old.flares.forEach(f => f.layers.forEach(({ mesh, geo, mat }) => { scene.remove(mesh); geo.dispose(); mat.dispose() }))
    old.shells.forEach(s => {
      scene.remove(s.mesh); s.mesh.material.dispose()
      if (s.arrow) scene.remove(s.arrow)
    })
    old.neos.forEach(n => {
      scene.remove(n.group)
      scene.remove(n.trail)
      n.trail.geometry.dispose()
    })
    if (old.aurora) {
      if (earthMesh) earthMesh.remove(old.aurora)
      old.aurora.traverse(obj => { if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose() } })
    }
    if (old.magnetosphere) {
      scene.remove(old.magnetosphere)
      old.magnetosphere.traverse(obj => { if (obj.isMesh || obj.isLine) { obj.geometry.dispose(); obj.material.dispose() } })
    }

    function parseHeliographic(loc) {
      if (!loc) return null
      const m = String(loc).match(/^([NS])(\d+(?:\.\d+)?)([EW])(\d+(?:\.\d+)?)$/i)
      if (!m) return null
      return {
        lat: parseFloat(m[2]) * (m[1].toUpperCase() === 'N' ? 1 : -1),
        lon: parseFloat(m[4]) * (m[3].toUpperCase() === 'W' ? -1 : 1),
      }
    }

    function heliographicToScene(lat, lon, earthLon, r = 3.0) {
      const latRad = lat * Math.PI / 180
      const lonRad = lon * Math.PI / 180
      const absLon = earthLon + lonRad
      return new THREE.Vector3(
        r * Math.cos(latRad) * Math.cos(absLon),
        r * Math.sin(latRad),
        r * Math.cos(latRad) * Math.sin(absLon)
      )
    }

    const earthLon = planetLongitudes['Earth'] ?? 0

    const flareCfg = {
      low:      { height: 1.2, core: 0.13, layers: [
        { radiusMult: 5.0, color: 0xcc2200, opacity: 0.10 },
        { radiusMult: 2.5, color: 0xff5500, opacity: 0.28 },
        { radiusMult: 1.0, color: 0xffcc44, opacity: 0.80 },
      ]},
      medium:   { height: 2.0, core: 0.17, layers: [
        { radiusMult: 5.5, color: 0xcc2200, opacity: 0.13 },
        { radiusMult: 2.5, color: 0xff6600, opacity: 0.32 },
        { radiusMult: 1.0, color: 0xffdd44, opacity: 0.85 },
      ]},
      high:     { height: 3.2, core: 0.22, layers: [
        { radiusMult: 6.0, color: 0xbb1500, opacity: 0.16 },
        { radiusMult: 2.5, color: 0xff4400, opacity: 0.38 },
        { radiusMult: 1.0, color: 0xffbb22, opacity: 0.90 },
      ]},
      critical: { height: 4.8, core: 0.28, layers: [
        { radiusMult: 7.0, color: 0xaa1100, opacity: 0.20 },
        { radiusMult: 2.5, color: 0xff3300, opacity: 0.45 },
        { radiusMult: 1.0, color: 0xffaa11, opacity: 0.95 },
      ]},
    }
    const SUN_R = 3.0

    const newFlares = selectedFlares.map((event, i) => {
      const sev = event.severity ?? 'low'
      const cfg = flareCfg[sev] || flareCfg.low

      let p0
      const hgeo = parseHeliographic(event.source_location)
      if (hgeo) {
        p0 = heliographicToScene(hgeo.lat, hgeo.lon, earthLon, SUN_R)
      } else {
        const angle = (i / Math.max(selectedFlares.length, 1)) * Math.PI * 2
        const phi   = Math.PI * 0.25 + Math.random() * Math.PI * 0.5
        p0 = new THREE.Vector3(SUN_R * Math.sin(phi) * Math.cos(angle), SUN_R * Math.cos(phi), SUN_R * Math.sin(phi) * Math.sin(angle))
      }

      const perp = new THREE.Vector3(p0.y + 0.1, -p0.x, 0).normalize()
      const p2   = p0.clone().applyAxisAngle(perp, 0.6).normalize().multiplyScalar(SUN_R)
      const mid  = p0.clone().add(p2).multiplyScalar(0.5).normalize()
      const p1   = mid.multiplyScalar(SUN_R + cfg.height)
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2)

      const layers = cfg.layers.map(layer => {
        const geo = new THREE.TubeGeometry(curve, 32, cfg.core * layer.radiusMult, 8, false)
        const mat = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.opacity,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        const mesh = new THREE.Mesh(geo, mat)
        scene.add(mesh)
        return { mesh, geo, mat }
      })

      return { layers }
    })

    const shellColors  = { low: 0x4488ff, medium: 0xffaa00, high: 0xff6600, critical: 0xff2200 }
    const shellOpacity = { low: 0.12, medium: 0.18, high: 0.24, critical: 0.32 }

    const newShells = selectedCME.map((event, i) => {
      const sev   = event.severity ?? 'low'
      const color = shellColors[sev] || shellColors.low
      const mesh  = new THREE.Mesh(
        new THREE.SphereGeometry(1, 28, 18),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, wireframe: true, depthWrite: false })
      )
      scene.add(mesh)

      let arrow = null
      const srcGeo = parseHeliographic(event.source_location)
      if (srcGeo) {
        const analyses = Array.isArray(event.cme_analyses) ? event.cme_analyses
          : (event.cme_analyses ? JSON.parse(event.cme_analyses) : [])
        const speed = analyses[0]?.speed ?? 0
        if (speed > 0) {
          const arrowLen = Math.max(1.5, Math.min(9, speed / 350))
          const origin   = heliographicToScene(srcGeo.lat, srcGeo.lon, earthLon, 2.4)
          const dir      = origin.clone().normalize()
          arrow = new THREE.ArrowHelper(dir, origin, arrowLen, color, arrowLen * 0.18, arrowLen * 0.10)
          scene.add(arrow)
        }
      }

      const shellSpeed = { low: 0.0006, medium: 0.0010, high: 0.0016, critical: 0.0024 }
      return {
        mesh, arrow,
        progress:   i / Math.max(selectedCME.length, 1),
        speed:      shellSpeed[sev] || shellSpeed.low,
        range:      28,
        maxOpacity: shellOpacity[sev] || shellOpacity.low,
      }
    })

    // Magnetosphere — proper dipole field lines at multiple L-shells.
    // Each field line follows r = L·cos²(λ), parametrized by magnetic latitude λ and
    // azimuthal angle φ around Earth's magnetic axis (y). Dayside closed loops + tail streaming.
    // L-shells range from deep inner belt to magnetopause; warm→cool colour gradient.
    // Vertices are rewritten each frame during CME impact for real geometry deformation.
    const MAG_SUN   = 2.5   // subsolar standoff  (~10 RE where RE=0.48)
    const MAG_TAIL  = 8
    const TAIL_R    = MAG_TAIL / MAG_SUN  // ≈ 3.8

    // L-shell fractions (inner→outer).  L = MAG_SUN * frac in scene units.
    const L_FRACS  = [0.10, 0.18, 0.28, 0.40, 0.53, 0.67, 0.82, 1.00]
    // Colour: yellow-orange (inner hot) → green → cyan → blue (outer magnetopause)
    const L_COLORS = [
      [1.00, 0.92, 0.08],
      [1.00, 0.65, 0.00],
      [0.65, 0.98, 0.00],
      [0.05, 1.00, 0.38],
      [0.00, 0.95, 0.80],
      [0.00, 0.72, 1.00],
      [0.12, 0.44, 1.00],
      [0.20, 0.24, 0.95],
    ]
    const L_OPS = [0.88, 0.82, 0.76, 0.70, 0.64, 0.58, 0.52, 0.44]

    const MERIDIANS = 14   // azimuthal slices around y-axis (Earth's dipole axis)
    const PTS       = 72   // points per field line

    const magGroup  = new THREE.Group()
    const fieldLines = []

    for (let li = 0; li < L_FRACS.length; li++) {
      const L       = MAG_SUN * L_FRACS[li]
      const [cr, cg, cb] = L_COLORS[li]
      const opacity = L_OPS[li]

      for (let m = 0; m < MERIDIANS; m++) {
        const phi = (m / MERIDIANS) * Math.PI * 2  // azimuthal angle around y

        const positions = new Float32Array(PTS * 3)
        const prescale  = new Float32Array(PTS * 3)  // pre-tail-scale positions for live deformation

        for (let i = 0; i < PTS; i++) {
          // Magnetic latitude: avoid exact poles (numerical singularity at ±90°)
          const lam = (-82 + (i / (PTS - 1)) * 164) * (Math.PI / 180)
          const r   = L * Math.cos(lam) * Math.cos(lam)   // dipole: r = L cos²(λ)
          const eq  = r * Math.cos(lam)                    // equatorial distance

          // Azimuthal angle φ rotates around y-axis: equatorial direction = (cos φ, 0, sin φ)
          const px = eq * Math.cos(phi)
          const py = r  * Math.sin(lam)
          const pz = eq * Math.sin(phi)

          prescale[i * 3]     = px
          prescale[i * 3 + 1] = py
          prescale[i * 3 + 2] = pz

          // Extend tail on nightside (px < 0)
          positions[i * 3]     = px < 0 ? px * TAIL_R : px
          positions[i * 3 + 1] = py
          positions[i * 3 + 2] = pz
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        const mat = new THREE.LineBasicMaterial({
          color: new THREE.Color(cr, cg, cb),
          transparent: true, opacity,
          depthWrite: false, blending: THREE.AdditiveBlending,
        })
        magGroup.add(new THREE.Line(geo, mat))
        fieldLines.push({ geo, prescale, positions, cr, cg, cb, opacity })
      }
    }

    // Bow-shock glow disc — brightens at the sunward face during CME arrival
    const impactDiscGeo = new THREE.CircleGeometry(MAG_SUN * 0.95, 52)
    const impactDiscMat = new THREE.MeshBasicMaterial({
      color: 0xff5500, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    })
    const impactDisc = new THREE.Mesh(impactDiscGeo, impactDiscMat)
    impactDisc.rotation.y = Math.PI / 2
    impactDisc.position.x = MAG_SUN * 0.88
    magGroup.add(impactDisc)

    magGroup.userData = { fieldLines, impactDisc, compressionAnim: 0, _lastCmp: 0, MAG_SUN, TAIL_R }

    scene.add(magGroup)
    const newMagnetosphere = magGroup
    const magnetospherePulsing = false

    // Aurora polar rings
    let newAurora = null
    if (selectedStorms.length > 0 && earthMesh) {
      const maxKp = selectedStorms.reduce((max, e) => {
        const arr = Array.isArray(e.kp_index) ? e.kp_index : (e.kp_index ? JSON.parse(e.kp_index) : [])
        const kp  = arr.length ? Math.max(...arr.map(k => k.kpIndex ?? 0)) : 0
        return Math.max(max, kp)
      }, 0)
      const color   = maxKp >= 7 ? 0xff4400 : maxKp >= 5 ? 0xbb00ff : 0x00ffaa
      const opacity = Math.min(0.18 + maxKp * 0.045, 0.80)

      const earthR = 0.48
      const latDeg = Math.max(48, 73 - maxKp * 3)
      const latRad = latDeg * Math.PI / 180
      const ringY  = earthR * Math.sin(latRad)
      const ringR  = earthR * Math.cos(latRad)

      const auroraGroup = new THREE.Group()

      const ringDefs = [
        { r: ringR,        tube: 0.017, op: opacity        },
        { r: ringR * 0.72, tube: 0.010, op: opacity * 0.50 },
      ]
      ringDefs.forEach(({ r, tube, op }) => {
        const geo = new THREE.TorusGeometry(r, tube, 8, 80)
        const mat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: op,
          blending: THREE.AdditiveBlending, depthWrite: false,
        })
        const north = new THREE.Mesh(geo, mat)
        north.rotation.x = Math.PI / 2
        north.position.y = ringY
        auroraGroup.add(north)

        const south = north.clone()
        south.position.y = -ringY
        auroraGroup.add(south)
      })

      newAurora = auroraGroup
      earthMesh.add(newAurora)
    }

    // NEO flying asteroids — sized, paced, and routed from real data
    const newNEOs = selectedNEO.map((event, i) => {
      const hazardous = event.is_potentially_hazardous

      // Body size from estimated diameter (km). Clamp to a visible range.
      const diamKm   = event.estimated_diameter?.kilometers?.estimated_diameter_min ?? 0.05
      const bodySize = Math.max(0.08, Math.min(0.32, diamKm * 1.8))

      // Speed from relative velocity (mph). Faster NEOs animate faster.
      const mph   = parseFloat(event.relative_velocity?.miles_per_hour ?? 20000)
      const speed = Math.max(0.0014, Math.min(0.0040, 0.0014 + (mph - 5000) / 45000 * 0.0026))

      // Miss distance (AU) maps to how close the bezier arc passes Earth.
      // 1 AU = 9 scene units (Earth's orbital radius). Clamp to keep it visible.
      const missAU    = parseFloat(event.miss_distance?.astronomical ?? 0.1)
      const missScene = Math.max(0.5, Math.min(4.0, missAU * 9))

      const trailColor = hazardous ? 0xff6644 : 0x44aaff

      const group = new THREE.Group()

      const body = new THREE.Mesh(
        new THREE.IcosahedronGeometry(bodySize, 1),
        new THREE.MeshStandardMaterial({ color: 0xbfb39a, roughness: 1, metalness: 0, emissive: 0x2b2112, emissiveIntensity: 0.3 })
      )
      group.add(body)

      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(bodySize * 1.5, 14, 14),
        new THREE.MeshBasicMaterial({ color: trailColor, transparent: true, opacity: hazardous ? 0.22 : 0.10, depthWrite: false })
      )
      group.add(glow)
      scene.add(group)

      const trail = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: trailColor, transparent: true, opacity: 0.65 })
      )
      scene.add(trail)

      const farDist = 12
      const total   = selectedNEO.length

      const orb   = event.orbital_data ?? {}
      const Omega = parseFloat(orb.ascending_node_longitude)
      const incl  = parseFloat(orb.inclination)

      let startOffset, controlOffset, endOffset

      if (!isNaN(Omega) && !isNaN(incl)) {
        // Use real orbital elements: Ω = longitude of ascending node (in-plane angle),
        // i = inclination (tilt out of ecliptic). These define the plane the NEO orbits in
        // and thus which direction it approaches Earth from.
        const OmegaRad = Omega * Math.PI / 180
        const inclRad  = incl  * Math.PI / 180
        const cosI = Math.cos(inclRad), sinI = Math.sin(inclRad)

        // Approach along the ascending node direction, tilted by inclination
        const approachDir = new THREE.Vector3(
          Math.cos(OmegaRad) * cosI,
          sinI,
          Math.sin(OmegaRad) * cosI
        ).normalize()

        // Exit ~120° offset from approach in the orbital plane
        const exitOmega = OmegaRad + Math.PI * 0.65
        const exitDir = new THREE.Vector3(
          Math.cos(exitOmega) * cosI,
          sinI * 0.5,
          Math.sin(exitOmega) * cosI
        ).normalize()

        startOffset   = approachDir.clone().multiplyScalar(farDist)
        endOffset     = exitDir.clone().multiplyScalar(farDist)
        const ctrlOmega = OmegaRad + Math.PI * 0.35
        controlOffset = new THREE.Vector3(
          Math.cos(ctrlOmega) * missScene,
          sinI * missScene,
          Math.sin(ctrlOmega) * missScene
        )
      } else {
        // Fallback: spread evenly around Earth if orbital data not yet fetched
        const angle     = (i / total) * Math.PI * 2 + Math.PI / 6
        const exitAngle = angle + Math.PI * 0.65
        const yOff      = (i - 1) * 0.8
        startOffset   = new THREE.Vector3(Math.cos(angle)            * farDist, yOff,     Math.sin(angle)            * farDist)
        endOffset     = new THREE.Vector3(Math.cos(exitAngle)        * farDist, yOff + 3, Math.sin(exitAngle)        * farDist)
        controlOffset = new THREE.Vector3(Math.cos(angle + Math.PI * 0.35) * missScene, missScene * 0.3, Math.sin(angle + Math.PI * 0.35) * missScene)
      }

      return {
        group, body, trail,
        startOffset, controlOffset, endOffset,
        progress: i / total,
        speed,
      }
    })

    weatherEffectsRef.current = { flares: newFlares, shells: newShells, aurora: newAurora, magnetosphere: newMagnetosphere, magnetospherePulsing, neos: newNEOs }

    return () => {
      newFlares.forEach(f => f.layers.forEach(({ mesh, geo, mat }) => { scene.remove(mesh); geo.dispose(); mat.dispose() }))
      newShells.forEach(s => {
        scene.remove(s.mesh); s.mesh.material.dispose()
        if (s.arrow) scene.remove(s.arrow)
      })
      newNEOs.forEach(n => {
        scene.remove(n.group)
        scene.remove(n.trail)
        n.trail.geometry.dispose()
      })
      if (newAurora) {
        if (earthMesh) earthMesh.remove(newAurora)
        newAurora.traverse(obj => { if (obj.isMesh) { obj.geometry.dispose(); obj.material.dispose() } })
      }
      if (newMagnetosphere) {
        scene.remove(newMagnetosphere)
        newMagnetosphere.traverse(obj => { if (obj.isMesh || obj.isLine) { obj.geometry.dispose(); obj.material.dispose() } })
      }
    }
  }, [selectedFlares, selectedCME, selectedStorms, selectedNEO, planetLongitudes])

  // Computed chain status from live today data
  const chainStatus = (() => {
    const sevOrder  = ['low', 'medium', 'high', 'critical']
    const topCmeSev = coronalMassEjectionEvents.reduce((best, e) =>
      sevOrder.indexOf(e.severity) > sevOrder.indexOf(best) ? e.severity : best, 'none')

    const cmeEtaHours = (() => {
      const fastest = coronalMassEjectionEvents.reduce((best, e) => {
        const s = getCmeSpeedKms(e)
        return s > best ? s : best
      }, 0)
      return fastest > 0 ? Math.round(AU_KM / fastest / 3600) : null
    })()

    const maxKp = geomagneticStormEvents.reduce((max, e) => {
      const arr = Array.isArray(e.kp_index) ? e.kp_index : []
      const kp  = arr.length ? Math.max(...arr.map(k => k.kpIndex ?? 0)) : 0
      return Math.max(max, kp)
    }, 0)

    return {
      cme:   { level: topCmeSev === 'none' ? 'nominal' : topCmeSev,
               text:  coronalMassEjectionEvents.length > 0 ? `${coronalMassEjectionEvents.length} EVENT${coronalMassEjectionEvents.length > 1 ? 'S' : ''}` : 'QUIET' },
      wind:  { level: topCmeSev === 'none' ? 'nominal' : topCmeSev,
               text:  cmeEtaHours !== null ? `ETA ~${cmeEtaHours}h` : (topCmeSev !== 'none' ? 'ENHANCED' : 'NOMINAL') },
      storm: { level: maxKp >= 7 ? 'critical' : maxKp >= 5 ? 'high' : maxKp > 0 ? 'medium' : 'nominal',
               text:  maxKp > 0 ? `Kp ${maxKp}` : 'QUIET' },
      aurora:{ level: maxKp >= 7 ? 'critical' : maxKp >= 5 ? 'high' : maxKp > 0 ? 'medium' : 'nominal',
               text:  maxKp >= 7 ? 'ACTIVE' : maxKp >= 5 ? 'POSSIBLE' : 'NONE' },
    }
  })()

  // History playback summary for selected day
  const playbackSummary = (() => {
    if (historyDaysBack === 0) return null
    const d = new Date()
    d.setDate(d.getDate() - historyDaysBack)
    const dateStr   = d.toISOString().split('T')[0]
    const cmeCount  = allCmeRows.filter(r => (r.start_time || '').startsWith(dateStr)).length
    const gstCount  = allGstRows.filter(r => (r.start_time || '').startsWith(dateStr)).length
    const linkCount = causalLinks.filter(l => (l.cme.start_time || '').startsWith(dateStr)).length
    return { cmeCount, gstCount, linkCount, dateStr }
  })()

  const activeCriticalEvents = [
    ...solarFlareEvents.filter(e => e.severity === 'critical'),
    ...coronalMassEjectionEvents.filter(e => e.severity === 'critical'),
    ...geomagneticStormEvents.filter(e => e.severity === 'critical'),
  ]

  const todayLabel = new Date().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }).toUpperCase()

  return (
    <div className="space-home">
      <RawDataModal data={selected} onClose={() => setSelected(null)} />
      <div className="orrery-mount" ref={canvasMountRef} />

      {hoveredPlanetName && (
        <div className="planet-tooltip">{hoveredPlanetName}</div>
      )}

      <div className="hud-topbar">
        <div className="hud-logo">
          <span className="hud-logo-nasa">AstroMetrics</span>
        </div>
        <div className="hud-clock">
          <span className="hud-clock-label">MISSION TIME</span>
          <span className="hud-clock-value">{currentUtcTime}</span>
        </div>
        {activeCriticalEvents.length > 0 && (
          <div className="hud-alert-banner">
            ⚡ {activeCriticalEvents.length} CRITICAL EVENT{activeCriticalEvents.length > 1 ? 'S' : ''} ACTIVE
          </div>
        )}
      </div>

      <button
        className={`sidebar-tab ${sidebarCollapsed ? 'sidebar-tab--collapsed' : ''}`}
        onClick={() => setSidebarCollapsed(c => !c)}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>

      <aside className={`space-sidebar ${sidebarCollapsed ? 'space-sidebar--collapsed' : ''}`}>
        <div className="sidebar-mode-toggle">
          <button className={`sidebar-mode-btn ${sidebarMode === 'today'   ? 'sidebar-mode-btn--active' : ''}`} onClick={() => setSidebarMode('today')}>Today</button>
          <button className={`sidebar-mode-btn ${sidebarMode === 'chain'   ? 'sidebar-mode-btn--active' : ''}`} onClick={() => setSidebarMode('chain')}>Chain</button>
          <button className={`sidebar-mode-btn ${sidebarMode === 'weather' ? 'sidebar-mode-btn--active' : ''}`} onClick={() => setSidebarMode('weather')}>Weather</button>
        </div>

        {sidebarMode === 'today' && (
          <div className="sidebar-scroll">
            <div className="sidebar-title">
              TODAY&apos;S EVENTS
              <span className="sidebar-date">{todayLabel}</span>
            </div>
            <EventCard type="Solar Flares"           icon="☀"  items={solarFlareEvents}         loading={solarFlaresLoading}       onItemClick={item => setSelected(item.raw)} />
            <EventCard type="Coronal Mass Ejections" icon="💨" items={coronalMassEjectionEvents} loading={cmeLoading}               onItemClick={item => setSelected(item.raw)} />
            <EventCard type="Geomagnetic Storms"     icon="🌐" items={geomagneticStormEvents}    loading={geomagneticStormsLoading} onItemClick={item => setSelected(item.raw)} />
            <div className="sidebar-footer">
              <span>Source: NASA DONKI</span>
              <a href="/events" className="sidebar-link">Full Log</a>
            </div>
          </div>
        )}

        {sidebarMode === 'chain' && (
          <div className="sidebar-scroll">
            <div className="chain-section-label">SPACE WEATHER CHAIN</div>
            <div className="chain-nodes">
              {[
                { icon: '☀',  label: 'CME',       ...chainStatus.cme   },
                { icon: '💨', label: 'SOLAR WIND', ...chainStatus.wind  },
                { icon: '🌐', label: 'Kp STORM',   ...chainStatus.storm },
                { icon: '🌌', label: 'AURORA',     ...chainStatus.aurora},
              ].map((node, i, arr) => (
                <div key={node.label} className="chain-node-row">
                  <div className={`chain-node chain-node--${node.level}`}>
                    <span className="chain-node-icon">{node.icon}</span>
                    <div className="chain-node-info">
                      <span className="chain-node-label">{node.label}</span>
                      <span className={`chain-node-status chain-status--${node.level}`}>{node.text}</span>
                    </div>
                  </div>
                  {i < arr.length - 1 && <div className="chain-arrow">↓</div>}
                </div>
              ))}
            </div>

            {causalLinks.length > 0 && (
              <>
                <div className="chain-section-label" style={{ marginTop: '12px' }}>LINKED EVENTS</div>
                {causalLinks.slice(0, 4).map((link, i) => (
                  <div key={i} className="causal-link-card">
                    <div className="causal-link-header">
                      <span className="causal-link-confidence">{link.confidence}% match</span>
                      <span className="causal-link-travel">{Math.round(link.travelHours)}h transit</span>
                    </div>
                    <div className="causal-link-row">
                      <span className="causal-link-type causal-type--cme">CME</span>
                      <span className="causal-link-time">{formatShortDate(link.cme.start_time)}</span>
                    </div>
                    <div className="causal-link-row">
                      <span className="causal-link-type causal-type--storm">STORM</span>
                      <span className="causal-link-time">{formatShortDate(link.gst.start_time)}</span>
                    </div>
                    <div className="causal-link-speed">{Math.round(link.speedKms)} km/s</div>
                  </div>
                ))}
              </>
            )}

            <div className="chain-section-label" style={{ marginTop: '12px' }}>HISTORY PLAYBACK</div>
            <div className="history-playback">
              <div className="playback-ends">
                <span>-7 days</span>
                <span>Today</span>
              </div>
              <input
                type="range" min={0} max={7} step={1}
                value={7 - historyDaysBack}
                onChange={e => setHistoryDaysBack(7 - Number(e.target.value))}
                className="playback-slider"
              />
              <div className="playback-date">{getPlaybackLabel(historyDaysBack)}</div>
              {playbackSummary && (
                <div className="playback-summary">
                  <span>{playbackSummary.cmeCount} CME · {playbackSummary.gstCount} storm{playbackSummary.gstCount !== 1 ? 's' : ''}</span>
                  {playbackSummary.linkCount > 0 && (
                    <span className="playback-links">{playbackSummary.linkCount} linked</span>
                  )}
                </div>
              )}
            </div>

            <div className="sidebar-footer">
              <span>Source: NASA DONKI</span>
              <a href="/cme-events" className="sidebar-link">CME Log</a>
            </div>
          </div>
        )}

        {sidebarMode === 'weather' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="viz-toggles">
              <div className="viz-toggles-label">VISUALIZATION</div>
              <button
                className={`orbit-speed-btn ${showMagnetosphere ? 'orbit-speed-btn-active' : ''}`}
                onClick={() => setShowMagnetosphere(v => !v)}
              >
                {showMagnetosphere ? '● ' : '○ '}MAGNETOSPHERE
              </button>
            </div>
            <WeatherWidget />
          </div>
        )}
      </aside>

      <div className="planet-legend">
        {PLANET_DEFINITIONS.map(planetDef => (
          <div
            key={planetDef.name}
            className={`legend-item ${hoveredPlanetName === planetDef.name ? 'legend-active' : ''}`}
          >
            <span className="legend-dot" style={{ background: planetDef.color }} />
            <span className="legend-name">{planetDef.name}</span>
          </div>
        ))}
      </div>

      {/* Orbit speed settings widget */}
      <div className="orbit-settings">
        <button
          className="orbit-settings-toggle"
          onClick={() => setSettingsOpen(o => !o)}
          title="Orbit speed settings"
        >
          <span className="orbit-settings-gear">⚙</span>
          <span className="orbit-settings-label">ORBIT</span>
        </button>

        {settingsOpen && (
          <div className="orbit-settings-panel">
            <div className="orbit-settings-title">ORBIT SPEED</div>
            <div className="orbit-speed-value">
              {orbitSpeed === 0 ? 'REAL TIME' : `${orbitSpeed % 1 === 0 ? orbitSpeed : orbitSpeed.toFixed(1)} day/s`}
            </div>
            <input
              type="range"
              min={0} max={5} step={0.1}
              value={orbitSpeed}
              onChange={e => setOrbitSpeed(Number(e.target.value))}
              className="orbit-speed-slider"
            />
            <div className="orbit-speed-ends">
              <span>Real Time</span>
              <span>5 day/s</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
