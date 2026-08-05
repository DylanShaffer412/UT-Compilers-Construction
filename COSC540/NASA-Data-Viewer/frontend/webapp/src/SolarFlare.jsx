import { useState, useEffect } from "react";
import RawDataModal from "./RawDataModal.jsx";
import "./SolarFlare.css";

const COLUMNS = [
  { key: "flr_id",           label: "Flare ID"         },
  { key: "begin_time",       label: "Begin"            },
  { key: "peak_time",        label: "Peak"             },
  { key: "end_time",         label: "End"              },
  { key: "class_type",       label: "Class"            },
  { key: "source_location",  label: "Location"         },
  { key: "active_region_num",label: "Active Region"    },
  { key: "catalog",          label: "Catalog"          },
  { key: "instruments",      label: "Instruments"      },
  { key: "linked_events",    label: "Linked Events"    },
  { key: "link",             label: "Details"          },
  { key: "note",             label: "Note"             },
];

// Map class letter to severity colour
function classColor(classType) {
  const letter = classType?.[0]?.toUpperCase();
  return { A: "#64748b", B: "#38bdf8", C: "#4ade80", M: "#facc15", X: "#f97316" }[letter] ?? "#8fb6ff";
}

function formatDt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("en-US", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function renderCell(col, row) {
  const val = row[col.key];

  if (col.key === "class_type") {
    return (
      <span className="flrBadge" style={{ "--badge-color": classColor(val) }}>
        {val ?? "—"}
      </span>
    );
  }

  if (col.key === "link") {
    return val
      ? <a className="flrLink" href={val} target="_blank" rel="noreferrer">View ↗</a>
      : "—";
  }

  if (col.key === "instruments") {
    const arr = Array.isArray(val) ? val : (typeof val === "string" ? JSON.parse(val) : []);
    return arr.map(i => i.displayName).join(", ") || "—";
  }

  if (col.key === "linked_events") {
    const arr = Array.isArray(val) ? val : (val ? JSON.parse(val) : []);
    if (!arr?.length) return "—";
    return (
      <span className="flrLinked">{arr.length} event{arr.length !== 1 ? "s" : ""}</span>
    );
  }

  if (["begin_time", "peak_time", "end_time"].includes(col.key)) {
    return formatDt(val);
  }

  if (col.key === "note") {
    return val
      ? <span className="flrNote" title={val}>{val.length > 60 ? val.slice(0, 58) + "…" : val}</span>
      : "—";
  }

  return val ?? "—";
}

export default function SolarFlarePage() {
  const [flares, setFlares]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [sortCol, setSortCol]   = useState("begin_time");
  const [sortDir, setSortDir]   = useState("desc");
  const [filter, setFilter]     = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/solar-flares")
      .then(r => r.json())
      .then(d => { setFlares(d.rows ?? []); setLoading(false); })
      .catch(() => { setError("Failed to load solar flare data."); setLoading(false); });
  }, []);

  function handleSort(key) {
    if (sortCol === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(key); setSortDir("asc"); }
  }

  const filtered = flares.filter(f => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      f.flr_id?.toLowerCase().includes(q) ||
      f.class_type?.toLowerCase().includes(q) ||
      f.source_location?.toLowerCase().includes(q) ||
      f.note?.toLowerCase().includes(q)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortCol] ?? "";
    const bv = b[sortCol] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <>
    <RawDataModal data={selected} onClose={() => setSelected(null)} />
    <div className="flrPage">
      <div className="flrHeader">
        <div>
          <h1 className="flrTitle">Solar Flares</h1>
          <p className="flrSubtitle">{flares.length} events on record</p>
        </div>
        <input
          className="flrSearch"
          type="text"
          placeholder="Search by ID, class, location…"
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
      </div>

      {/* Legend */}
      <div className="flrLegend">
        {["A","B","C","M","X"].map(l => (
          <span key={l} className="flrLegendItem">
            <span className="flrLegendDot" style={{ background: classColor(l) }} />
            {l}-class
          </span>
        ))}
      </div>

      {loading && <div className="flrState">Loading…</div>}
      {error   && <div className="flrState flrStateError">{error}</div>}

      {!loading && !error && (
        <div className="flrTableWrapper">
          <table className="flrTable">
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className={`flrTh ${sortCol === col.key ? "flrThActive" : ""}`}
                    onClick={() => handleSort(col.key)}
                  >
                    {col.label}
                    {sortCol === col.key && (
                      <span className="flrSortArrow">{sortDir === "asc" ? " ↑" : " ↓"}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr><td colSpan={COLUMNS.length} className="flrEmpty">No results</td></tr>
              )}
              {sorted.map((row, i) => (
                <tr key={row.flr_id ?? i} className="flrRow flrRowClickable" onClick={() => setSelected(row)}>
                  {COLUMNS.map(col => (
                    <td key={col.key} className="flrTd">{renderCell(col, row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </>
  );
}
