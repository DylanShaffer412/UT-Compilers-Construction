import { createContext, useContext, useState } from 'react'

const WeatherContext = createContext(null)

export function WeatherProvider({ children }) {
  const [selectedFlares,  setSelectedFlares]  = useState([])
  const [selectedCME,     setSelectedCME]     = useState([])
  const [selectedStorms,  setSelectedStorms]  = useState([])
  const [selectedNEO,     setSelectedNEO]     = useState([])

  return (
    <WeatherContext.Provider value={{
      selectedFlares,  setSelectedFlares,
      selectedCME,     setSelectedCME,
      selectedStorms,  setSelectedStorms,
      selectedNEO,     setSelectedNEO,
    }}>
      {children}
    </WeatherContext.Provider>
  )
}

export function useWeather() {
  return useContext(WeatherContext)
}
