import { useEffect, useState } from 'react'

function calculatePhase() {
  const knownNewMoon = new Date('2000-01-06')
  const today = new Date()

  const millisecondsSinceNewMoon = today - knownNewMoon
  const daysSinceNewMoon = millisecondsSinceNewMoon / (1000 * 60 * 60 * 24)

  const lunarCycleTime = 29.53
  const phase = (daysSinceNewMoon % lunarCycleTime + lunarCycleTime) % lunarCycleTime

  if (phase < 1.85) return 'New Moon'
  if (phase < 7.38) return 'Waxing Crescent'
  if (phase < 9.22) return 'First Quarter'
  if (phase < 14.77) return 'Waxing Gibbous'
  if (phase < 16.61) return 'Full Moon'
  if (phase < 22.15) return 'Waning Gibbous'
  if (phase < 23.99) return 'Last Quarter'
  return 'Waning Crescent'
}

function callTodayAPI(apiName) {
  return fetch(`http://localhost:8000/api/${apiName}/today`)
    .then((res) => res.json())
    .then((data) => (data.rows?.length > 0 ? data.rows : []))
    .catch(() => [])
}

function DailyOverlay() {
  const [items, setItems] = useState([])
  const [fallbackText, setFallbackText] = useState('')

  useEffect(() => {
    async function loadDailyReport() {
      const [cmes, flares, storms, eclipses, neos, lunarRows] = await Promise.all([
        callTodayAPI('cme-events'),
        callTodayAPI('solar-flares'),
        callTodayAPI('geomagnetic-storms'),
        callTodayAPI('solar-eclipses'),
        callTodayAPI('near-earth-objects'),
        callTodayAPI('lunar-phase'),
      ])

      const todayItems = []

      cmes.forEach((cme) => {
        const cmeType = cme?.cme_analyses?.[0]?.type
        todayItems.push(
          cmeType
            ? `Coronal mass ejection detected today (${cmeType}).`
            : 'Coronal mass ejection detected today.'
        )
      })

      flares.forEach((flare) => {
        todayItems.push(
          flare?.class_type
            ? `Solar flare activity today: Class ${flare.class_type}.`
            : 'Solar flare activity detected today.'
        )
      })

      storms.forEach((storm) => {
        const kp = storm?.kp_index?.[0]?.kpIndex
        todayItems.push(
          kp !== undefined && kp !== null
            ? `Geomagnetic storm conditions today (Kp ${kp}).`
            : 'Geomagnetic storm conditions detected today.'
        )
      })

      eclipses.forEach(() => {
        todayItems.push('A solar eclipse event is listed for today.')
      })

      neos.forEach((neo) => {
        todayItems.push(
          neo?.name
            ? `Near-Earth object tracked today: ${neo.name}.`
            : 'A near-Earth object is being tracked today.'
        )
      })

      setItems(todayItems.slice(0, 3))

      if (todayItems.length === 0) {
        const lunarPhase = lunarRows?.[0]?.phase || calculatePhase()
        setFallbackText(`No major space weather events reported today. Lunar phase: ${lunarPhase}.`)
      } else {
        setFallbackText('')
      }
    }

    loadDailyReport()
  }, [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="daily-overlay">
      <div className="daily-overlay__header">
        <p className="daily-overlay__eyebrow">Daily Report</p>
        <h2 className="daily-overlay__date">{today}</h2>
      </div>

      <div className="daily-overlay__body">
        {items.length > 0 ? (
          items.map((item, index) => (
            <div key={index} className="daily-overlay__item">
              {item}
            </div>
          ))
        ) : (
          <div className="daily-overlay__item">{fallbackText}</div>
        )}
      </div>
    </div>
  )
}

export default DailyOverlay