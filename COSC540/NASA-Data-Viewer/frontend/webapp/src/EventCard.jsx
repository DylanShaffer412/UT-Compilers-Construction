import './EventCard.css'

export default function EventCard({ event, type, onClick }) {
  return (
    <div className={`event-card event-card--${type}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="event-card__header">
        <span className="event-card__type">{type.toUpperCase()}</span>
        {event.class_type && (
          <span className="event-card__class">{event.class_type}</span>
        )}
      </div>

      <div className="event-card__body">
        {event.begin_time && (
          <div className="event-card__row">
            <span className="event-card__label">BEGIN</span>
            <span className="event-card__value">
              {new Date(event.begin_time).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'UTC', timeZoneName: 'short'
              })}
            </span>
          </div>
        )}

        {event.peak_time && (
          <div className="event-card__row">
            <span className="event-card__label">PEAK</span>
            <span className="event-card__value">
              {new Date(event.peak_time).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'UTC', timeZoneName: 'short'
              })}
            </span>
          </div>
        )}

        {event.startTime && (
          <div className="event-card__row">
            <span className="event-card__label">START</span>
            <span className="event-card__value">
              {new Date(event.startTime).toLocaleString('en-US', {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
                timeZone: 'UTC', timeZoneName: 'short'
              })}
            </span>
          </div>
        )}

        {event.source_location && (
          <div className="event-card__row">
            <span className="event-card__label">SOURCE</span>
            <span className="event-card__value">{event.source_location}</span>
          </div>
        )}

        {event.kpIndex && (
          <div className="event-card__row">
            <span className="event-card__label">Kp INDEX</span>
            <span className="event-card__value">{event.kpIndex}</span>
          </div>
        )}

        {event.note && (
          <div className="event-card__note">{event.note.slice(0, 120)}{event.note.length > 120 ? '…' : ''}</div>
        )}
      </div>
    </div>
  )
}
