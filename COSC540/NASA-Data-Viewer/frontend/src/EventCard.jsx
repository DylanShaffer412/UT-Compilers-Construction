import "./EventCard.css"
import {useState} from 'react'

function EventCard({eventType, eventDescription = null, eventSeverity = null, eventPeakTime = null}){
    const [showDescription, setShowDescription] = useState(false)


    return(
        <div className="DailyEvents_EventCard" onClick={() => setShowDescription(!showDescription)}>
            <div className="event_header">
                <p>{eventType}</p>
                {eventSeverity && <p>{eventSeverity}</p>}
            </div>
            {eventDescription && 
            <>
                {/* TODO: figure out why showing the description also streches element upwards */}
                <a href="#" className="icon" onClick={() => setShowDescription(!showDescription)}>
                    {showDescription ? "-" : "+"}
                </a>
                {showDescription && <p className="event_description">{eventDescription}</p>}
            </>
            }
        </div>
    )
}

export default EventCard