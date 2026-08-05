
import { useState, useEffect } from "react";
import RawDataModal from "./RawDataModal.jsx";
import "./WeeklySummary.css";

const EVENT_TYPES = [
  { key: "cme-events",        label: "CME",              color: "#f97316", idField: "activity_id" },
  { key: "solar-flares",      label: "Solar Flare",      color: "#facc15", idField: "flr_id"      },
  { key: "geomagnetic-storms",label: "Geomagnetic Storm",color: "#818cf8", idField: "gst_id"      },
];

function getSeverity(type, row) {
  if (type === "cme-events")
    return row.cme_analyses?.[0]?.type ? `Type ${row.cme_analyses[0].type}` : null;
  if (type === "solar-flares")
    return row.class_type ? `Class ${row.class_type}` : null;
  if (type === "geomagnetic-storms")
    return row.kp_index?.[0]?.kpIndex != null ? `Kp ${row.kp_index[0].kpIndex}` : null;
  return null;
}

function getTimestamp(type, row) {
  if (type === "cme-events")        return row.start_time;
  if (type === "solar-flares")      return row.begin_time;
  if (type === "geomagnetic-storms")return row.start_time;
  return null;
}

function getStrongestFlare(flares) {
  if (!flares?.length) return null;
  const order = ["A","B","C","M","X"];
  return flares.reduce((best, f) => {
    const bc = f.class_type?.[0] ?? "A";
    const ac = best.class_type?.[0] ?? "A";
    if (order.indexOf(bc) > order.indexOf(ac)) return f;
    if (order.indexOf(bc) === order.indexOf(ac)) {
      return parseFloat(f.class_type?.slice(1)) > parseFloat(best.class_type?.slice(1)) ? f : best;
    }
    return best;
  });
}

function getStrongestStorm(storms) {
  if (!storms?.length) return null;
  return storms.reduce((best, s) => {
    const bKp = s.kp_index?.[0]?.kpIndex ?? 0;
    const aKp = best.kp_index?.[0]?.kpIndex ?? 0;
    return bKp > aKp ? s : best;
  });
}

function dayLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default function WeeklySummary() {
  const [allEvents, setAllEvents] = useState({ "cme-events": [], "solar-flares": [], "geomagnetic-storms": [] });
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [selected, setSelected]   = useState(null);
  const [eventList, setEventList] = useState(null); // { label, color, events }

  useEffect(() => {
    const fetches = EVENT_TYPES.map(({ key }) =>
      fetch(`http://localhost:8000/api/${key}/week`)
        .then(r => r.json())
        .then(d => ({ key, rows: d.rows ?? [] }))
        .catch(() => ({ key, rows: [] }))
    );

    Promise.all(fetches)
      .then(results => {
        const map = {};
        results.forEach(({ key, rows }) => (map[key] = rows));
        setAllEvents(map);
        setLoading(false);
      })
      .catch(() => { setError("Failed to load data."); setLoading(false); });
  }, []);

  // Build day buckets for the past 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const eventsByDay = days.map(day => {
    const entries = [];
    EVENT_TYPES.forEach(({ key, label, color }) => {
      allEvents[key].forEach(row => {
        const ts = getTimestamp(key, row);
        if (ts && ts.startsWith(day)) {
          entries.push({ label, color, severity: getSeverity(key, row), note: row.note, raw: row });
        }
      });
    });
    return { day, entries };
  });

  const cmes   = allEvents["cme-events"];
  const flares = allEvents["solar-flares"];
  const storms = allEvents["geomagnetic-storms"];

  const strongestFlare = getStrongestFlare(flares);
  const strongestStorm = getStrongestStorm(storms);
  const strongestCme   = cmes.length ? cmes.find(c => c.cme_analyses?.[0]?.type === "S") ?? cmes[0] : null;

  if (loading) return <div className="wsPage wsLoading">Loading weekly data…</div>;
  if (error)   return <div className="wsPage wsError">{error}</div>;

  return (
    <>
    <RawDataModal data={selected} onClose={() => setSelected(null)} />

    {eventList && (
      <div className="rdm-backdrop" onClick={() => setEventList(null)}>
        <div className="rdm-panel" onClick={e => e.stopPropagation()}>
          <div className="rdm-header">
            <span className="rdm-title" style={{ color: eventList.color }}>{eventList.label.toUpperCase()} — {eventList.events.length} EVENTS</span>
            <button className="rdm-close" onClick={() => setEventList(null)}>✕</button>
          </div>
          <div className="rdm-body">
            {eventList.events.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#3a5070', fontFamily: 'Share Tech Mono, monospace', fontSize: '12px' }}>
                No events this week
              </div>
            )}
            {eventList.events.map((row, i) => (
              <div
                key={i}
                className="wsListRow"
                style={{ "--accent": eventList.color }}
                onClick={() => { setEventList(null); setSelected(row); }}
              >
                <span className="wsListDot" />
                <div className="wsListInfo">
                  <span className="wsListSeverity">{getSeverity(
                    EVENT_TYPES.find(t => t.label === eventList.label)?.key ?? "",
                    row
                  ) ?? "—"}</span>
                  <span className="wsListTime">{
                    new Date(getTimestamp(
                      EVENT_TYPES.find(t => t.label === eventList.label)?.key ?? "",
                      row
                    )).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" })
                  }</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
    <div className="wsPage">

      {/* ── SUMMARY COUNTERS ── */}
      <section className="wsSection">
        <h2 className="wsSectionTitle">7-Day Event Summary</h2>
        <div className="wsSummaryGrid">
          {EVENT_TYPES.map(({ key, label, color }) => (
            <div
              className="wsSummaryCard wsClickable"
              key={key}
              style={{ "--accent": color }}
              onClick={() => setEventList({ label, color, events: allEvents[key] })}
            >
              <span className="wsSummaryCount">{allEvents[key].length}</span>
              <span className="wsSummaryLabel">{label}{allEvents[key].length !== 1 ? "s" : ""}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── SEVERITY HIGHLIGHTS ── */}
      <section className="wsSection">
        <h2 className="wsSectionTitle">Severity Highlights</h2>
        <div className="wsHighlightGrid">
          {strongestFlare ? (
            <div className="wsHighlightCard wsClickable" style={{ "--accent": "#facc15" }} onClick={() => setSelected(strongestFlare)}>
              <p className="wsHighlightEyebrow">Strongest Solar Flare</p>
              <p className="wsHighlightValue">Class {strongestFlare.class_type}</p>
              <p className="wsHighlightSub">{strongestFlare.source_location ?? "—"}</p>
            </div>
          ) : <div className="wsHighlightCard wsEmpty"><p>No flares this week</p></div>}

          {strongestStorm ? (
            <div className="wsHighlightCard wsClickable" style={{ "--accent": "#818cf8" }} onClick={() => setSelected(strongestStorm)}>
              <p className="wsHighlightEyebrow">Strongest Geomagnetic Storm</p>
              <p className="wsHighlightValue">Kp {strongestStorm.kp_index?.[0]?.kpIndex}</p>
              <p className="wsHighlightSub">{strongestStorm.gst_id ?? "—"}</p>
            </div>
          ) : <div className="wsHighlightCard wsEmpty"><p>No storms this week</p></div>}

          {strongestCme ? (
            <div className="wsHighlightCard wsClickable" style={{ "--accent": "#f97316" }} onClick={() => setSelected(strongestCme)}>
              <p className="wsHighlightEyebrow">Notable CME</p>
              <p className="wsHighlightValue">{getSeverity("cme-events", strongestCme) ?? "CME"}</p>
              <p className="wsHighlightSub">{strongestCme.source_location ?? "—"}</p>
            </div>
          ) : <div className="wsHighlightCard wsEmpty"><p>No CMEs this week</p></div>}
        </div>
      </section>

      {/* ── DAY-BY-DAY BREAKDOWN ── */}
      <section className="wsSection">
        <h2 className="wsSectionTitle">Day-by-Day Breakdown</h2>
        <div className="wsDayGrid">
          {eventsByDay.map(({ day, entries }) => (
            <div className="wsDayCard" key={day}>
              <p className="wsDayLabel">{dayLabel(day)}</p>
              {entries.length === 0
                ? <p className="wsDayEmpty">No events</p>
                : entries.map((e, i) => (
                    <div className="wsDayEvent wsClickable" key={i} style={{ "--accent": e.color }} onClick={() => setSelected(e.raw)}>
                      <span className="wsDayEventDot" />
                      <span className="wsDayEventText">
                        {e.label}{e.severity ? ` — ${e.severity}` : ""}
                      </span>
                    </div>
                  ))
              }
            </div>
          ))}
        </div>
      </section>

    </div>
    </>
  );
}
