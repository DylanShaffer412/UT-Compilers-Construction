import { useEffect, useMemo, useState } from "react";

export default function CMEEventsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:8000/api/cme");

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Expected JSON from CME endpoint.");
        }

        const data = await res.json();

        if (!ignore) {
          const list = Array.isArray(data) ? data : (data.rows ?? [])
          setRows(list.map((item) => ({
            activity_id: item.activity_id,
            start_time: item.start_time,
            source_location: item.source_location,
            active_region_num: item.active_region_num,
            link: item.link,
          })));
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load CME data.");
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
      return { totalEvents: 0, latestStart: "--", sourceRegions: 0, locatedEvents: 0 };
    }

    const latestRow = rows.reduce((latest, row) => {
      const latestTime = latest?.start_time ? new Date(latest.start_time) : null;
      const currentTime = row?.start_time ? new Date(row.start_time) : null;
      if (!currentTime || Number.isNaN(currentTime.getTime())) return latest;
      if (!latestTime || Number.isNaN(latestTime.getTime())) return row;
      return currentTime > latestTime ? row : latest;
    }, null);

    const uniqueRegions = new Set(
      rows.map((row) => normalizeRegion(row.active_region_num)).filter((v) => v !== null)
    );

    const locatedEvents = rows.filter((row) => Boolean(cleanText(row.source_location))).length;

    return {
      totalEvents: rows.length,
      latestStart: latestRow?.start_time ? formatDateTime(latestRow.start_time) : "--",
      sourceRegions: uniqueRegions.size,
      locatedEvents,
    };
  }, [rows]);

  return (
    <div style={styles.page}>
      <div style={styles.scanOverlay} />

      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>NASA DONKI / CME FORECAST</p>
            <h1 style={styles.title}>Coronal Mass Ejection Monitor</h1>
            <p style={styles.subtitle}>
              CME events with start times, source regions, active region IDs,
              and direct DONKI references.
            </p>
          </div>
        </header>

        <section style={styles.kpiGrid}>
          <KpiCard label="CME Events" value={stats.totalEvents} />
          <KpiCard label="Latest Event Start" value={stats.latestStart} />
          <KpiCard label="Unique Active Regions" value={stats.sourceRegions} />
          <KpiCard label="Events With Source Location" value={stats.locatedEvents} />
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>CME Event Table</h2>
              <p style={styles.panelText}>
                CME records returned from your backend forecast endpoint with
                source metadata and reference links.
              </p>
            </div>
          </div>

          {loading && (
            <div style={styles.messageBox}>
              <p style={styles.loadingText}>Loading CME data...</p>
            </div>
          )}

          {error && !loading && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div style={styles.messageBox}>
              <p style={styles.emptyText}>No CME records found.</p>
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Activity ID</th>
                    <th style={styles.th}>Start Time</th>
                    <th style={styles.th}>Source Location</th>
                    <th style={styles.th}>Active Region</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const hasLocation = Boolean(cleanText(row.source_location));
                    const hasRegion = normalizeRegion(row.active_region_num) !== null;

                    return (
                      <tr
                        key={row.activity_id || `${row.start_time}-${index}`}
                        style={{ ...styles.tr, ...(hasLocation ? styles.trEmphasis : {}) }}
                      >
                        <td style={styles.td}>
                          <span style={styles.nameText}>{row.activity_id || "N/A"}</span>
                        </td>

                        <td style={styles.td}>{formatDateTime(row.start_time)}</td>

                        <td style={styles.td}>
                          {cleanText(row.source_location) ? (
                            <span style={styles.locationText}>{row.source_location}</span>
                          ) : (
                            <span style={styles.muted}>Unknown</span>
                          )}
                        </td>

                        <td style={styles.td}>
                          {hasRegion ? (
                            <span style={styles.regionChip}>
                              AR {normalizeRegion(row.active_region_num)}
                            </span>
                          ) : (
                            <span style={styles.muted}>N/A</span>
                          )}
                        </td>

                        <td style={styles.td}>
                          <div style={styles.statusWrap}>
                            <span style={{ ...styles.badge, ...(hasLocation ? styles.badgeInfo : styles.badgeNeutral) }}>
                              {hasLocation ? "Located" : "Partial"}
                            </span>
                            <span style={{ ...styles.badge, ...(hasRegion ? styles.badgeSafe : styles.badgeNeutral) }}>
                              {hasRegion ? "Region Tagged" : "No Region"}
                            </span>
                          </div>
                        </td>

                        <td style={styles.td}>
                          {row.link ? (
                            <a href={row.link} target="_blank" rel="noreferrer" style={styles.link}>
                              DONKI
                            </a>
                          ) : (
                            <span style={styles.muted}>N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
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

function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function normalizeRegion(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (Number.isFinite(parsed)) return parsed;
  const text = String(value).trim();
  return text ? text : null;
}

function formatDateTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #102948 0%, #08111f 35%, #050b14 100%)",
    color: "#e6eef8",
    position: "relative",
    overflowX: "hidden",
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
  kpiSubvalue: { color: "#7dd3fc", fontSize: "13px" },
  panel: {
    background: "rgba(7, 14, 26, 0.86)", border: "1px solid rgba(148, 163, 184, 0.12)",
    borderRadius: "20px", overflow: "hidden", boxShadow: "0 16px 40px rgba(0,0,0,0.28)", backdropFilter: "blur(8px)",
  },
  panelHeader: { padding: "20px 20px 16px", borderBottom: "1px solid rgba(148, 163, 184, 0.10)" },
  panelTitle: { margin: 0, fontSize: "20px", fontWeight: 700, color: "#f8fbff" },
  panelText: { margin: "6px 0 0", color: "#94a3b8", fontSize: "14px" },
  tableWrap: { width: "100%", overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: "1000px" },
  th: {
    textAlign: "left", padding: "14px 16px", fontSize: "12px", textTransform: "uppercase",
    letterSpacing: "0.08em", color: "#94a3b8", borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
    background: "rgba(15, 23, 42, 0.72)", position: "sticky", top: 0, zIndex: 1,
  },
  tr: { borderBottom: "1px solid rgba(148, 163, 184, 0.08)" },
  trEmphasis: { background: "rgba(14, 116, 144, 0.10)" },
  td: { padding: "16px", fontSize: "14px", color: "#e2e8f0", verticalAlign: "middle" },
  nameText: { fontWeight: 700, color: "#f8fbff" },
  locationText: { color: "#dbeafe", fontWeight: 500 },
  regionChip: {
    display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: "999px",
    fontSize: "12px", fontWeight: 700, background: "rgba(59, 130, 246, 0.14)",
    color: "#93c5fd", border: "1px solid rgba(59, 130, 246, 0.18)",
  },
  statusWrap: { display: "flex", flexWrap: "wrap", gap: "8px" },
  badge: { display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.02em", border: "1px solid transparent" },
  badgeNeutral: { background: "rgba(100, 116, 139, 0.18)", color: "#cbd5e1", border: "1px solid rgba(148, 163, 184, 0.22)" },
  badgeSafe: { background: "rgba(34, 197, 94, 0.14)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.18)" },
  badgeInfo: { background: "rgba(6, 182, 212, 0.14)", color: "#67e8f9", border: "1px solid rgba(6, 182, 212, 0.18)" },
  link: { color: "#7dd3fc", textDecoration: "none", fontWeight: 600 },
  muted: { color: "#64748b" },
  messageBox: { padding: "28px 20px" },
  loadingText: { margin: 0, color: "#cbd5e1", fontSize: "15px" },
  emptyText: { margin: 0, color: "#94a3b8", fontSize: "15px" },
  errorBox: { margin: "20px", padding: "16px", borderRadius: "14px", background: "rgba(127, 29, 29, 0.20)", border: "1px solid rgba(248, 113, 113, 0.24)" },
  errorText: { margin: 0, color: "#fecaca", fontSize: "14px" },
};
