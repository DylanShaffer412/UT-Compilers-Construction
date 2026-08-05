import { useEffect, useMemo, useState } from "react";

export default function GeomagneticStormsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("http://localhost:8000/api/gst");

        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.includes("application/json")) {
          throw new Error("Expected JSON from GST endpoint.");
        }

        const data = await res.json();

        if (!ignore) {
          const list = Array.isArray(data) ? data : (data.rows ?? [])
          setRows(list.map((item) => ({
            gst_id: item.gst_id,
            start_time: item.start_time,
            kp_index: item.kp_index || [],
            link: item.link,
          })));
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || "Failed to load GST data.");
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

  const normalizedRows = useMemo(() => {
    return rows.map((row) => {
      const kpEntries = normalizeKpIndex(row.kp_index);
      const maxKp = getMaxKp(kpEntries);
      const latestObservedKp = getLatestKp(kpEntries);
      return { ...row, kpEntries, maxKp, latestObservedKp };
    });
  }, [rows]);

  const stats = useMemo(() => {
    if (!normalizedRows.length) {
      return { totalStorms: 0, maxKp: "--", severeCount: 0, latestStart: "--" };
    }

    const maxKp = normalizedRows.reduce((best, row) => {
      const value = parseNumber(row.maxKp);
      if (value === null) return best;
      if (best === null || value > best) return value;
      return best;
    }, null);

    const severeCount = normalizedRows.filter((row) => {
      const value = parseNumber(row.maxKp);
      return value !== null && value >= 7;
    }).length;

    const latestRow = normalizedRows.reduce((latest, row) => {
      const latestTime = latest?.start_time ? new Date(latest.start_time) : null;
      const currentTime = row?.start_time ? new Date(row.start_time) : null;
      if (!currentTime || Number.isNaN(currentTime.getTime())) return latest;
      if (!latestTime || Number.isNaN(latestTime.getTime())) return row;
      return currentTime > latestTime ? row : latest;
    }, null);

    return {
      totalStorms: normalizedRows.length,
      maxKp: maxKp !== null ? maxKp : "--",
      severeCount,
      latestStart: latestRow?.start_time ? formatDateTime(latestRow.start_time) : "--",
    };
  }, [normalizedRows]);

  return (
    <div style={styles.page}>
      <div style={styles.scanOverlay} />

      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.eyebrow}>NASA DONKI / GST FORECAST</p>
            <h1 style={styles.title}>Geomagnetic Storm Monitor</h1>
            <p style={styles.subtitle}>
              Geomagnetic storm events with Kp activity details, severity
              indicators, and source references.
            </p>
          </div>
        </header>

        <section style={styles.kpiGrid}>
          <KpiCard label="Storm Events" value={stats.totalStorms} />
          <KpiCard label="Max Kp Observed" value={stats.maxKp} danger={parseNumber(stats.maxKp) >= 7} />
          <KpiCard label="Severe Storms" value={stats.severeCount} subvalue="Kp 7 or higher" danger={stats.severeCount > 0} />
          <KpiCard label="Latest Event Start" value={stats.latestStart} />
        </section>

        <section style={styles.panel}>
          <div style={styles.panelHeader}>
            <div>
              <h2 style={styles.panelTitle}>GST Event Table</h2>
              <p style={styles.panelText}>
                Each event includes the strongest Kp value found in the returned
                Kp index series.
              </p>
            </div>
          </div>

          {loading && (
            <div style={styles.messageBox}>
              <p style={styles.loadingText}>Loading GST data...</p>
            </div>
          )}

          {error && !loading && (
            <div style={styles.errorBox}>
              <p style={styles.errorText}>{error}</p>
            </div>
          )}

          {!loading && !error && normalizedRows.length === 0 && (
            <div style={styles.messageBox}>
              <p style={styles.emptyText}>No GST records found.</p>
            </div>
          )}

          {!loading && !error && normalizedRows.length > 0 && (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>GST ID</th>
                    <th style={styles.th}>Start Time</th>
                    <th style={styles.th}>Max Kp</th>
                    <th style={styles.th}>Latest Kp</th>
                    <th style={styles.th}>Severity</th>
                    <th style={styles.th}>Kp Samples</th>
                    <th style={styles.th}>Link</th>
                  </tr>
                </thead>
                <tbody>
                  {normalizedRows.map((row, index) => {
                    const severity = getSeverityLabel(row.maxKp);
                    const severe = parseNumber(row.maxKp) >= 7;

                    return (
                      <tr
                        key={row.gst_id || `${row.start_time}-${index}`}
                        style={{ ...styles.tr, ...(severe ? styles.trHazard : {}) }}
                      >
                        <td style={styles.td}>
                          <span style={styles.nameText}>{row.gst_id || "N/A"}</span>
                        </td>

                        <td style={styles.td}>{formatDateTime(row.start_time)}</td>

                        <td style={styles.td}>
                          <strong>{row.maxKp ?? "--"}</strong>
                        </td>

                        <td style={styles.td}>{row.latestObservedKp ?? "--"}</td>

                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...getSeverityBadgeStyle(row.maxKp) }}>
                            {severity}
                          </span>
                        </td>

                        <td style={styles.td}>{renderKpSamples(row.kpEntries)}</td>

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

function normalizeKpIndex(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getKpValue(entry) {
  return parseNumber(entry?.kpIndex) ?? parseNumber(entry?.kp_index) ?? parseNumber(entry?.kp) ?? null;
}

function getMaxKp(entries) {
  if (!entries.length) return null;
  return entries.reduce((best, entry) => {
    const value = getKpValue(entry);
    if (value === null) return best;
    if (best === null || value > best) return value;
    return best;
  }, null);
}

function getLatestKp(entries) {
  if (!entries.length) return null;
  const datedEntries = entries
    .map((entry) => {
      const observedTime = entry?.observedTime || entry?.observed_time || entry?.timeTag || null;
      return { value: getKpValue(entry), observedTime, date: observedTime ? new Date(observedTime) : null };
    })
    .filter((entry) => entry.value !== null);
  if (!datedEntries.length) return null;
  const withValidDates = datedEntries.filter((e) => e.date && !Number.isNaN(e.date.getTime()));
  if (withValidDates.length) {
    withValidDates.sort((a, b) => b.date - a.date);
    return withValidDates[0].value;
  }
  return datedEntries[datedEntries.length - 1].value;
}

function getSeverityLabel(kp) {
  const value = parseNumber(kp);
  if (value === null) return "Unknown";
  if (value >= 8) return "Extreme";
  if (value >= 7) return "Severe";
  if (value >= 5) return "Active";
  return "Minor";
}

function getSeverityBadgeStyle(kp) {
  const value = parseNumber(kp);
  if (value === null) return styles.badgeNeutral;
  if (value >= 8) return styles.badgeExtreme;
  if (value >= 7) return styles.badgeDanger;
  if (value >= 5) return styles.badgeWarning;
  return styles.badgeSafe;
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

function renderKpSamples(entries) {
  if (!entries.length) return <span style={styles.muted}>No Kp data</span>;
  const values = entries.map((e) => getKpValue(e)).filter((v) => v !== null).slice(0, 6);
  if (!values.length) return <span style={styles.muted}>No Kp data</span>;
  return (
    <div style={styles.sampleWrap}>
      {values.map((value, index) => (
        <span key={`${value}-${index}`} style={{ ...styles.sampleChip, ...getSeverityBadgeStyle(value) }}>
          Kp {value}
        </span>
      ))}
      {entries.length > 6 ? <span style={styles.sampleMore}>+{entries.length - 6} more</span> : null}
    </div>
  );
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
  kpiSubvalue: { color: "#7dd3fc", fontSize: "13px" },
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
    background: "rgba(15, 23, 42, 0.72)", position: "sticky", top: 0, zIndex: 1,
  },
  tr: { borderBottom: "1px solid rgba(148, 163, 184, 0.08)" },
  trHazard: { background: "rgba(127, 29, 29, 0.14)" },
  td: { padding: "16px", fontSize: "14px", color: "#e2e8f0", verticalAlign: "middle" },
  nameText: { fontWeight: 700, color: "#f8fbff" },
  badge: { display: "inline-flex", alignItems: "center", padding: "6px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, letterSpacing: "0.02em", border: "1px solid transparent" },
  badgeNeutral: { background: "rgba(100, 116, 139, 0.18)", color: "#cbd5e1", border: "1px solid rgba(148, 163, 184, 0.22)" },
  badgeSafe: { background: "rgba(34, 197, 94, 0.14)", color: "#86efac", border: "1px solid rgba(34, 197, 94, 0.18)" },
  badgeWarning: { background: "rgba(245, 158, 11, 0.16)", color: "#fcd34d", border: "1px solid rgba(245, 158, 11, 0.20)" },
  badgeDanger: { background: "rgba(239, 68, 68, 0.18)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.22)" },
  badgeExtreme: { background: "rgba(168, 85, 247, 0.18)", color: "#d8b4fe", border: "1px solid rgba(168, 85, 247, 0.22)" },
  sampleWrap: { display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" },
  sampleChip: { display: "inline-flex", alignItems: "center", padding: "4px 8px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, border: "1px solid transparent" },
  sampleMore: { color: "#94a3b8", fontSize: "12px" },
  link: { color: "#7dd3fc", textDecoration: "none", fontWeight: 600 },
  muted: { color: "#64748b" },
  messageBox: { padding: "28px 20px" },
  loadingText: { margin: 0, color: "#cbd5e1", fontSize: "15px" },
  emptyText: { margin: 0, color: "#94a3b8", fontSize: "15px" },
  errorBox: { margin: "20px", padding: "16px", borderRadius: "14px", background: "rgba(127, 29, 29, 0.20)", border: "1px solid rgba(248, 113, 113, 0.24)" },
  errorText: { margin: 0, color: "#fecaca", fontSize: "14px" },
};
