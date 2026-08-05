import { useState, useEffect } from "react";
import "./LunarPhases.css";

// ── PHASE CONFIG ──────────────────────────────────────────────
const PHASE_META = {
  "New Moon":      { icon: "🌑", color: "#94a3b8", label: "New Moon"      },
  "First Quarter": { icon: "🌓", color: "#facc15", label: "First Quarter" },
  "Full Moon":     { icon: "🌕", color: "#e2e8f0", label: "Full Moon"     },
  "Last Quarter":  { icon: "🌗", color: "#818cf8", label: "Last Quarter"  },
};

const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── HELPERS ───────────────────────────────────────────────────
function phaseDate(p) {
  // noon UTC so timezone offsets don't flip the date
  return new Date(Date.UTC(p.year, p.month - 1, p.day, 12));
}

function formatDate(p) {
  const d = phaseDate(p);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
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
  const todayUTC = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  const phaseUTC = Date.UTC(p.year, p.month - 1, p.day);
  const days = Math.round((phaseUTC - todayUTC) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 0)  return `${Math.abs(days)}d ago`;
  return `In ${days} days`;
}

function isPast(p) {
  const todayUTC = Date.UTC(
    new Date().getUTCFullYear(),
    new Date().getUTCMonth(),
    new Date().getUTCDate()
  );
  return Date.UTC(p.year, p.month - 1, p.day) < todayUTC;
}

function findNextPhase(phases) {
  return phases.find(p => !isPast(p)) ?? phases[phases.length - 1];
}

// ── COMPONENT ─────────────────────────────────────────────────
export default function LunarPhasesPage() {
  const [phases, setPhases]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    const now     = new Date();
    const dateStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    // nump=4 → one complete lunar cycle (all four primary phases)
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
      <div className="lunarPage">
        <div className="lunarState">
          <span className="lunarSpinner" />
          <span>Querying U.S. Naval Observatory…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lunarPage">
        <div className="lunarState lunarStateError">⚠ {error}</div>
      </div>
    );
  }

  const next = findNextPhase(phases);
  const nextMeta = PHASE_META[next?.phase] ?? { icon: "🌙", color: "#8fb6ff" };

  return (
    <div className="lunarPage">

      {/* ── HERO: next upcoming phase ── */}
      {next && (
        <div className="lunarHero">
          <div className="lunarHeroText">
            <p className="lunarHeroEyebrow">Next Primary Phase</p>
            <p className="lunarHeroPhase" style={{ color: nextMeta.color }}>
              {next.phase}
            </p>
            <p className="lunarHeroCountdown">
              {formatDate(next)} · {daysUntil(next)}
            </p>
          </div>
          <span className="lunarHeroMoon">{nextMeta.icon}</span>
        </div>
      )}

      {/* ── PHASE LIST ── */}
      <h2 className="lunarSectionTitle">Full Lunar Cycle</h2>

      <div className="lunarCards">
        {phases.map((phase, i) => {
          const meta   = PHASE_META[phase.phase] ?? { icon: "🌙", color: "#8fb6ff", label: phase.phase };
          const past   = isPast(phase);
          const until  = daysUntil(phase);
          return (
            <div
              key={i}
              className={`lunarCard${past ? " lunarCardPast" : ""}`}
              style={{ "--phase-color": meta.color }}
            >
              <span className="lunarCardIcon">{meta.icon}</span>
              <div className="lunarCardBody">
                <p className="lunarCardPhase">{meta.label}</p>
                <p className="lunarCardDate">{formatDate(phase)}</p>
                <p className="lunarCardTime">{formatTime(phase.time)}</p>
              </div>
              <span className="lunarCardBadge">
                {past ? "passed" : until}
              </span>
            </div>
          );
        })}
      </div>

    </div>
  );
}
