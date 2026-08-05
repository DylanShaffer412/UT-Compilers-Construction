import { useEffect, useMemo, useState } from "react";

export default function NearEarthObjectsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:8000/api/neows/upcoming");

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Expected JSON from NEO endpoint.");
        }

        const data = await res.json();

        if (!ignore) {
          setRows(
            Array.isArray(data)
              ? data.map(normalizeNeoRow)
              : Array.isArray(data.rows)
                ? data.rows.map(normalizeNeoRow)
                : []
          );
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load NEO data.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      ignore = true;
    };
  }, []);

  const stats = useMemo(() => {
    if (!rows.length) {
      return { total: 0, hazardous: 0, closestName: "--", closestDistance: null, fastestName: "--", fastestVelocity: null };
    }

    const hazardousCount = rows.filter((r) => r.hazardous).length;

    const closest = rows.reduce((best, current) => {
      const bestValue = parseNumber(best?.miss_distance_miles);
      const currentValue = parseNumber(current?.miss_distance_miles);
      if (bestValue === null) return current;
      if (currentValue === null) return best;
      return currentValue < bestValue ? current : best;
    }, null);

    const fastest = rows.reduce((best, current) => {
      const bestValue = parseNumber(best?.velocity_mph);
      const currentValue = parseNumber(current?.velocity_mph);
      if (bestValue === null) return current;
      if (currentValue === null) return best;
      return currentValue > bestValue ? current : best;
    }, null);

    return {
      total: rows.length,
      hazardous: hazardousCount,
      closestName: closest?.name || "--",
      closestDistance: parseNumber(closest?.miss_distance_miles),
      fastestName: fastest?.name || "--",
      fastestVelocity: parseNumber(fastest?.velocity_mph),
    };
  }, [rows]);

  return (
    <div style={styles.page}>
      <div style={styles.scanOverlay} />

      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>NASA / NEO FORECAST</p>
            <h1 style={styles.title}>Near-Earth Object Monitor</h1>
            <p style={styles.subtitle}>
              Upcoming close approaches with hazard, velocity, miss distance,
              and estimated size data.
            </p>
          </div>
        </header>

        <section style={styles.kpiGrid}>
          <KpiCard label="Tracked Objects" value={stats.total} />
          <KpiCard label="Potentially Hazardous" value={stats.hazardous} danger />
          <KpiCard
            label="Closest Pass"
            value={stats.closestDistance !== null ? `${formatNumber(stats.closestDistance)} mi` : "--"}
            subvalue={stats.closestName}
          />
          <KpiCard
            label="Fastest Object"
            value={stats.fastestVelocity !== null ? `${formatNumber(stats.fastestVelocity)} mph` : "--"}
            subvalue={stats.fastestName}
          />
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>Forecast Table</h2>
              <p style={styles.panelText}>Objects ordered by close approach date.</p>
            </div>
          </div>

          {loading && (
            <div style={styles.messageBox}>
              <p style={styles.loadingText}>Loading NEO data...</p>
            </div>
          )}

          {error && !loading && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div style={styles.messageBox}>
              <p style={styles.emptyText}>No NEO records found.</p>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Approach Date</th>
                    <th style={styles.th}>Hazard</th>
                    <th style={styles.th}>Velocity</th>
                    <th style={styles.th}>Miss Distance</th>
                    <th style={styles.th}>Diameter</th>
                    <th style={styles.th}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.neo_id || `${row.name}-${index}`}
                      style={{ ...styles.tr, ...(row.hazardous ? styles.trHazard : {}) }}
                    >
                      <td style={styles.td}>
                        <div style={styles.nameCell}>
                          <span style={styles.nameText}>{row.name || "Unknown"}</span>
                          <span style={styles.idText}>ID: {row.neo_id || "N/A"}</span>
                        </div>
                      </td>

                      <td style={styles.td}>{formatDate(row.approach_date)}</td>

                      <td style={styles.td}>
                        <span style={{ ...styles.badge, ...(row.hazardous ? styles.badgeDanger : styles.badgeSafe) }}>
                          {row.hazardous ? "Hazardous" : "No"}
                        </span>
                      </td>

                      <td style={styles.td}>{formatNumber(row.velocity_mph)} mph</td>

                      <td style={styles.td}>{formatNumber(row.miss_distance_miles)} mi</td>

                      <td style={styles.td}>
                        {formatDiameterRange(row.estimated_diameter_min, row.estimated_diameter_max)}
                      </td>

                      <td style={styles.td}>
                        {row.nasa_jpl_url ? (
                          <a href={row.nasa_jpl_url} target="_blank" rel="noreferrer" style={styles.link}>
                            NASA JPL
                          </a>
                        ) : (
                          <span style={styles.muted}>N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function normalizeNeoRow(row) {
  const estimatedFeet = row?.estimated_diameter?.feet || {};
  const relativeVelocity = row?.relative_velocity || {};
  const missDistance = row?.miss_distance || {};
  const closeApproach = Array.isArray(row?.close_approach_data) && row.close_approach_data.length
    ? row.close_approach_data[0]
    : null;

  return {
    neo_id: row.neo_id ?? row.neo_reference_id ?? row.id ?? row.asteroid_id ?? null,
    name: row.name ?? row.asteroid_name ?? "Unknown",
    approach_date:
      row.approach_date ??
      row.close_approach_time ??
      row.close_approach_date ??
      closeApproach?.close_approach_date_full ??
      row.closeApproachDate ??
      null,
    hazardous: toBool(
      row.hazardous ??
      row.is_hazardous ??
      row.is_potentially_hazardous ??
      row.is_potentially_hazardous_asteroid ??
      row.potentially_hazardous
    ),
    velocity_mph:
      row.velocity_mph ??
      relativeVelocity?.miles_per_hour ??
      closeApproach?.relative_velocity?.miles_per_hour ??
      row.relative_velocity_mph ??
      row.velocity ??
      row.speed_mph ??
      null,
    miss_distance_miles:
      row.miss_distance_miles ??
      missDistance?.miles ??
      closeApproach?.miss_distance?.miles ??
      row.miss_distance ??
      row.miss_distance_mi ??
      null,
    estimated_diameter_min:
      row.estimated_diameter_min ??
      estimatedFeet?.estimated_diameter_min ??
      row.estimated_diameter_min_ft ??
      row.diameter_min ??
      null,
    estimated_diameter_max:
      row.estimated_diameter_max ??
      estimatedFeet?.estimated_diameter_max ??
      row.estimated_diameter_max_ft ??
      row.diameter_max ??
      null,
    nasa_jpl_url: row.nasa_jpl_url ?? row.jpl_url ?? row.url ?? null,
  };
}

function KpiCard({ label, value, subvalue, danger = false }) {
  return (
    <div style={{ ...styles.kpiCard, ...(danger ? styles.kpiCardDanger : {}) }}>
      <div style={styles.kpiLabel}>{label}</div>
      <div style={{ ...styles.kpiValue, ...(danger ? styles.kpiValueDanger : {}) }}>{value}</div>
      {subvalue ? <div style={styles.kpiSubvalue}>{subvalue}</div> : null}
    </div>
  );
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.toLowerCase();
    return v === "true" || v === "yes" || v === "1";
  }
  if (typeof value === "number") return value === 1;
  return Boolean(value);
}

function formatNumber(value) {
  const parsed = parseNumber(value);
  if (parsed === null) return "--";
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function formatDate(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDiameterRange(min, max) {
  const minNum = parseNumber(min);
  const maxNum = parseNumber(max);
  if (minNum === null && maxNum === null) return "--";
  if (minNum !== null && maxNum !== null) return `${formatNumber(minNum)} - ${formatNumber(maxNum)} ft`;
  if (minNum !== null) return `${formatNumber(minNum)} ft`;
  return `${formatNumber(maxNum)} ft`;
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #102948 0%, #08111f 35%, #050b14 100%)",
    color: "#e6eef8", position: "relative", overflowX: "hidden",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  scanOverlay: {
    position: "absolute", inset: 0, pointerEvents: "none",
    background: "linear-gradient(to bottom, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.00) 50%, rgba(255,255,255,0.015) 100%)",
    opacity: 0.35,
  },
  container: { position: "relative", zIndex: 1, maxWidth: "1400px", margin: "0 auto", padding: "32px 24px 48px" },
  header: { marginBottom: "24px" },
  eyebrow: { margin: 0, color: "#7dd3fc", fontSize: "12px", letterSpacing: "0.18em", fontWeight: 700 },
  title: { margin: "8px 0 10px", fontSize: "38px", lineHeight: 1.05, fontWeight: 800, color: "#f8fbff" },
  subtitle: { margin: 0, maxWidth: "760px", color: "#94a3b8", fontSize: "15px", lineHeight: 1.6 },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" },
  kpiCard: {
    background: "rgba(10, 18, 32, 0.82)", border: "1px solid rgba(125, 211, 252, 0.12)",
    borderRadius: "18px", padding: "18px 18px 16px", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", backdropFilter: "blur(8px)",
  },
  kpiCardDanger: { border: "1px solid rgba(248, 113, 113, 0.22)" },
  kpiLabel: { color: "#94a3b8", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px", fontWeight: 700 },
  kpiValue: { fontSize: "28px", fontWeight: 800, color: "#f8fbff", marginBottom: "6px" },
  kpiValueDanger: { color: "#fca5a5" },
  kpiSubvalue: { color: "#7dd3fc", fontSize: "13px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  panel: {
    background: "rgba(7, 14, 26, 0.86)", border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "20px", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.28)", backdropFilter: "blur(8px)",
  },
  panelHeader: { padding: "20px 20px 16px", borderBottom: "1px solid rgba(148, 163, 184, 0.10)" },
  panelTitle: { margin: 0, fontSize: "20px", fontWeight: 700, color: "#f8fbff" },
  panelText: { margin: "6px 0 0", color: "#94a3b8", fontSize: "14px" },
  tableWrap: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "1100px" },
  th: {
    textAlign: "left", padding: "14px 16px", fontSize: "12px", textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#94a3b8", borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
    background: "rgba(15, 23, 42, 0.72)",
  },
  tr: { borderBottom: "1px solid rgba(148, 163, 184, 0.08)" },
  trHazard: { background: "rgba(127, 29, 29, 0.14)" },
  td: { padding: "16px", fontSize: "14px", color: "#e2e8f0", verticalAlign: "middle" },
  nameCell: { display: "flex", flexDirection: "column", gap: "4px" },
  nameText: { fontWeight: 700, color: "#f8fbff" },
  idText: { color: "#64748b", fontSize: "12px" },
  badge: { display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.02em" },
  badgeDanger: { background: "rgba(239, 68, 68, 0.18)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.22)" },
  badgeSafe: { background: "rgba(34, 197, 94, 0.14)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.18)" },
  link: { color: "#7dd3fc", textDecoration: "none", fontWeight: 600 },
  muted: { color: "#64748b" },
  messageBox: { padding: "28px 20px" },
  loadingText: { margin: 0, color: "#cbd5e1", fontSize: "15px" },
  emptyText: { margin: 0, color: "#94a3b8", fontSize: "15px" },
  errorBox: { margin: "20px", padding: "16px", borderRadius: "14px", background: "rgba(127, 29, 29, 0.20)", border: "1px solid rgba(248, 113, 113, 0.24)" },
  errorText: { margin: 0, color: "#fecaca", fontSize: "14px" },
};
