import { useState, useEffect } from "react";
import "./LunarPhases.css";

// ── PHASE CONFIG ──────────────────────────────────────────────
const PHASE_META = {
  "New Moon":        { icon: "🌑", color: "#94a3b8", label: "NEW MOON" },
  "First Quarter":   { icon: "🌓", color: "#facc15", label: "FIRST QUARTER" },
  "Full Moon":       { icon: "🌕", color: "#e2e8f0", label: "FULL MOON" },
  "Last Quarter":    { icon: "🌗", color: "#818cf8", label: "LAST QUARTER" },
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── HELPERS ───────────────────────────────────────────────────
function phaseDate(p) {
  return new Date(p.year, p.month - 1, p.day);
}

function formatDate(p) {
  const d = phaseDate(p);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  return `${weekday}, ${MONTH_NAMES[p.month]} ${p.day}, ${p.year}`;
}

function formatTime(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour   = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix} UTC`;
}

function daysUntil(p) {
  const now   = new Date();
  const then  = phaseDate(p);
  const diffMs = then.setHours(0, 0, 0, 0) - now.setHours(0, 0, 0, 0);
  const days  = Math.round(diffMs / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0)  return `${Math.abs(days)}d ago`;
  return `In ${days} days`;
}

function findNextPhase(phases) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return phases.find(p => {
    const d = phaseDate(p);
    d.setHours(0, 0, 0, 0);
    return d >= now;
  }) ?? phases[0];
}

// ── COMPONENT ────────────────────────────────────────────────
export default function LunarPhasesPage() {
  const [phases, setPhases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    // nump=4 → exactly one full lunar cycle (New → First Quarter → Full → Last Quarter)
    fetch(`https://aa.usno.navy.mil/api/moon/phases/date?date=${dateStr}&nump=4`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setPhases(data.phasedata ?? []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message ?? "Failed to load lunar phase data.");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="lunar-page">
        <div className="lunar-state">
          <span className="lunar-spinner" />
          <span>Querying U.S. Naval Observatory…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lunar-page">
        <div className="lunar-state lunar-state-error">⚠ {error}</div>
      </div>
    );
  }

  const nextPhase = findNextPhase(phases);

  return (
    <div className="lunar-page">

      {/* ── PAGE HEADER ── */}
      <div className="lunar-header">
        <h1 className="lunar-title">LUNAR PHASE CYCLE</h1>
        <p className="lunar-subtitle">
          U.S. NAVAL OBSERVATORY · ONE COMPLETE LUNAR CYCLE · TIMES IN UTC
        </p>
      </div>

      {/* ── CYCLE TRACK ── */}
      <div className="lunar-track">
        <div className="lunar-track-line" />
        {phases.map((phase, i) => {
          const meta    = PHASE_META[phase.phase] ?? { icon: "🌙", color: "#8fb6ff", label: phase.phase.toUpperCase() };
          const isNext  = phase === nextPhase;
          return (
            <div className="lunar-track-node" key={i}>
              <div
                className={`lunar-moon-icon${isNext ? " is-next" : ""}`}
                style={{ background: isNext ? "rgba(100,160,255,0.07)" : "rgba(20,30,55,0.6)" }}
                title={`${phase.phase} — ${formatDate(phase)} at ${formatTime(phase.time)}`}
              >
                {meta.icon}
              </div>
              <div className="lunar-node-label" style={{ color: meta.color }}>{meta.label}</div>
              <div className="lunar-node-date">{MONTH_NAMES[phase.month]} {phase.day}</div>
              <div className="lunar-node-time">{formatTime(phase.time)}</div>
            </div>
          );
        })}
      </div>

      {/* ── NEXT PHASE BANNER ── */}
      {nextPhase && (() => {
        const meta    = PHASE_META[nextPhase.phase] ?? { icon: "🌙", color: "#8fb6ff" };
        const until   = daysUntil(nextPhase);
        const isToday = until === "Today";
        return (
          <div className="lunar-next-banner" style={{ borderLeftColor: meta.color }}>
            <div>
              <p className="lunar-next-eyebrow">Next Primary Phase</p>
              <p className="lunar-next-name">
                {meta.icon}&nbsp; {nextPhase.phase.toUpperCase()}
              </p>
              <p style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: "11px", letterSpacing: "1.5px", color: "#6888aa", margin: "6px 0 0" }}>
                {formatDate(nextPhase)} · {formatTime(nextPhase.time)}
              </p>
            </div>
            <div className="lunar-next-countdown">
              <div className="lunar-next-countdown-value" style={{ color: meta.color }}>
                {isToday ? "TODAY" : until}
              </div>
              {!isToday && (
                <div className="lunar-next-countdown-label">until phase</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── DETAIL CARDS ── */}
      <section>
        <h2 className="lunar-section-title">Phase Details</h2>
        <div className="lunar-cards">
          {phases.map((phase, i) => {
            const meta   = PHASE_META[phase.phase] ?? { icon: "🌙", color: "#8fb6ff", label: phase.phase.toUpperCase() };
            const isPast = phaseDate(phase) < new Date(new Date().setHours(0, 0, 0, 0));
            return (
              <div
                className="lunar-card"
                key={i}
                style={{
                  "--phase-color": meta.color,
                  opacity: isPast ? 0.55 : 1,
                }}
              >
                <span className="lunar-card-icon">{meta.icon}</span>
                <p className="lunar-card-phase">{meta.label}</p>
                <p className="lunar-card-datetime">
                  {formatDate(phase)}<br />
                  {formatTime(phase.time)}
                </p>
                <div className="lunar-card-divider" />
                <p className="lunar-card-meta">
                  Status&nbsp; <span>{isPast ? "passed" : daysUntil(phase)}</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
