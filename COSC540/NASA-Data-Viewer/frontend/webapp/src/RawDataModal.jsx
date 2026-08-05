import './RawDataModal.css'

export default function RawDataModal({ data, onClose }) {
  if (!data) return null

  return (
    <div className="rdm-backdrop" onClick={onClose}>
      <div className="rdm-panel" onClick={e => e.stopPropagation()}>
        <div className="rdm-header">
          <span className="rdm-title">RAW DATA</span>
          <button className="rdm-close" onClick={onClose}>✕</button>
        </div>
        <div className="rdm-body">
          {Object.entries(data).map(([key, val]) => (
            <div key={key} className="rdm-row">
              <span className="rdm-key">{key}</span>
              <span className="rdm-val">
                {val === null || val === undefined
                  ? '—'
                  : typeof val === 'object'
                  ? JSON.stringify(val, null, 2)
                  : String(val)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
