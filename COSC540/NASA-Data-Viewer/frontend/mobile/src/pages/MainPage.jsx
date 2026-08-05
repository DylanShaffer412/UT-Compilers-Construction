import SolarSystemScene from '../components/SolarSystemScene'
import DailyOverlay from '../components/DailyOverlay'
import NotableEventsOverlay from '../components/NotableEventsOverlay'

function MainPage({
  activeViewEnabled,
  setActiveViewEnabled,
  selectedNotableEvent,
  setSelectedNotableEvent,
}) {
  return (
    <div className="main-content main-view">
      <SolarSystemScene
        activeViewEnabled={activeViewEnabled}
        selectedNotableEvent={selectedNotableEvent}
      />
      <DailyOverlay />
      <NotableEventsOverlay
        activeViewEnabled={activeViewEnabled}
        setActiveViewEnabled={setActiveViewEnabled}
        selectedNotableEvent={selectedNotableEvent}
        setSelectedNotableEvent={setSelectedNotableEvent}
      />
    </div>
  )
}

export default MainPage
