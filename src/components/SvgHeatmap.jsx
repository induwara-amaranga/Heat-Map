// SvgHeatmap.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import axios from "axios";

const SVG_URL = "/campus.svg";
// If you use a Vite proxy, set API_URL = "/heatmap/map-data"
const API_URL = "http://localhost:3000/heatmap/map-data";

/* ---------- Map gutter (OSM) bbox ---------- */
const BBOX_W = 80.5903, BBOX_S = 7.2519, BBOX_E = 80.5939, BBOX_N = 7.2560;
const OSM_EMBED = `https://www.openstreetmap.org/export/embed.html?bbox=${BBOX_W},${BBOX_S},${BBOX_E},${BBOX_N}&layer=mapnik`;

/* ------------- Look & feel ------------- */
const FILL_OPACITY = 0.40;
const STROKE_WIDTH = 1.5;
const MAP_SCALE = 1;

/* ---------- Sample capacities (edit anytime) ---------- */
const CAPACITY = {
  B1:120, B2:100, B3:60,  B4:120, B5:120, B6:150, B7:50,  B8:80,  B9:200,
  B10:40, B11:80, B12:60, B13:40, B14:80, B15:100, B16:60, B17:90, B18:120,
  B19:70, B20:90, B21:120, B22:70, B23:90, B24:150, B25:60, B26:120, B27:160,
  B28:100, B29:100, B30:100, B31:80, B32:60, B33:120, B34:120
};

/* ---------- Building display names ---------- */
const BUILDING_NAMES = {
  B1:"Heat Eng. Lab",
  B2:"Library",
  B3:"Drawing Office",
  B4:"Lecture Hall 1",
  B5:"Lecture Hall 2",
  B6:"Lecture Hall 3",
  B7:"Admin Block",
  B8:"Canteen",
  B9:"Auditorium",
  B10:"IT Center",
  B11:"Computer Lab",
  B12:"Drawing Office",
  B13:"Electronics Lab",
  B14:"Mechanical Lab",
  B15:"Civil Eng. Lab",
  B16:"Physics Lab",
  B17:"Chemistry Lab",
  B18:"Biology Lab",
  B19:"Maths Dept",
  B20:"Physics Dept",
  B21:"Chemistry Dept",
  B22:"Biology Dept",
  B23:"Faculty Office",
  B24:"Research Center",
  B25:"Gymnasium",
  B26:"Sports Complex",
  B27:"Swimming Pool",
  B28:"Hostel A",
  B29:"Hostel B",
  B30:"Hostel C",
  B31:"Cafeteria",
  B32:"Bookshop",
  B33:"Medical Center",
  B34:"Auditorium Annex",
};


export default function SvgHeatmap() {
  const hostRef = useRef(null);
  const svgRef  = useRef(null);

  const [err, setErr] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  // Live data from API
  const [buildingInfo, setBuildingInfo] = useState({});    // { B1: { name, current, capacity?, updatedAt? } }
  const [buildingColors, setBuildingColors] = useState({}); // { B1: "#hex" }

  // Refs for event handlers
  const infoRef   = useRef(buildingInfo);
  const colorsRef = useRef(buildingColors);
  useEffect(() => { infoRef.current = buildingInfo; }, [buildingInfo]);
  useEffect(() => { colorsRef.current = buildingColors; }, [buildingColors]);

  const [popup, setPopup] = useState(null);

  /* -------- Derived lists -------- */
  const list = useMemo(() => {
    return Object.entries(buildingInfo).map(([id, info]) => {
      const status = statusFor(info);
      const color  = buildingColors[id] || colorForStatus(status);
      return {
        id,
        name: info?.name || id,
        current: info?.current ?? null,
        capacity: info?.capacity ?? null,
        occ: occPct(info),
        status,
        color
      };
    });
  }, [buildingInfo, buildingColors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(b =>
      b.id.toLowerCase().includes(q) || (b.name || "").toLowerCase().includes(q)
    );
  }, [list, search]);

  const totals = useMemo(() => {
    const totalPeople = list.reduce((s, b) => s + (b.current || 0), 0);
    const byStatus = { Low: 0, Moderate: 0, Busy: 0, High: 0, Critical: 0, Unknown: 0 };
    list.forEach(b => { if (byStatus[b.status] != null) byStatus[b.status]++; else byStatus.Unknown++; });
    return { totalPeople, byStatus };
  }, [list]);

  /* ---------------- SVG bootstrapping ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(SVG_URL);
        const text = await res.text();
        if (cancelled) return;

        if (!hostRef.current) return;
        hostRef.current.innerHTML = text;

        const svg = hostRef.current.querySelector("svg");
        if (!svg) throw new Error("No <svg> root found in campus.svg");

        svg.setAttribute("width", "100%");
        svg.setAttribute("height", "100%");
        svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
        svg.style.display = "block";
        
        ensureViewBoxFitsContent(svg);
        expandUses(svg);

        // 🔑 Annotate all shapes/groups with canonical building ids like B1, B18A
        annotateCanonicalBuildingIds(svg);

        svgRef.current = svg;

        const closeOnInside = (e) => {
          if (!hostRef.current) return;
          if (!hostRef.current.contains(e.target)) return;
          const isBuilding = e.target.closest("[data-building-id]");
          if (!isBuilding) setPopup(null);
        };
        hostRef.current.addEventListener("click", closeOnInside);
        return () => hostRef.current?.removeEventListener("click", closeOnInside);
      } catch (e) {
        setErr(`Failed to load SVG: ${e.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ---------------- Live fetcher (AXIOS) ---------------- */
  function normalizeLivePayload(raw) {
    // Accept BOTH shapes:
    // A) Minimal: { data: [ { id, count }, ... ] }
    // B) Rich:    { success, source, data: [ { building_id, building_name, current_crowd, color, status_timestamp }, ... ] }
    const arr = Array.isArray(raw?.data) ? raw.data : [];
    const out = {};

    for (const item of arr) {
      // Prefer minimal keys if present
      const id = item?.id || item?.building_id;
      if (!id) continue;

      const current =
        (typeof item?.count === "number") ? item.count :
        (typeof item?.current_crowd === "number") ? item.current_crowd : null;

      out[id] = {
        name: item?.building_name || item?.name || id,
        current,
        color: item?.color || null,
        // use provided timestamp or fallback to "now"
        updatedAt: item?.status_timestamp ? new Date(item.status_timestamp) : new Date()
      };
    }
    return out;
  }

  async function fetchLive({ silent=false } = {}) {
    try {
      const { data } = await axios.get(API_URL);
      const payload = normalizeLivePayload(data);

      setBuildingInfo(prev => {
        const next = { ...prev };
        for (const [id, v] of Object.entries(payload)) {
          next[id] = {
            ...(next[id] || {}),
            name: v.name,
            name: BUILDING_NAMES[id] ?? v.name ?? next[id]?.name ?? id,
            current: v.current,
            // inject capacity from our local table (editable later)
            capacity: CAPACITY[id] ?? next[id]?.capacity ?? null,
            updatedAt: v.updatedAt ?? next[id]?.updatedAt ?? null
          };
        }
        return next;
      });

      // optional server color overrides; not required when capacities exist
      setBuildingColors(prev => {
        const next = { ...prev };
        for (const [id, v] of Object.entries(payload)) {
          if (v.color) next[id] = v.color;
        }
        return next;
      });

      // last updated (fallback to now if timestamps missing)
      const newest = (Array.isArray(data?.data) ? data.data : [])
        .map(x => new Date(x?.status_timestamp || Date.now()))
        .filter(d => !isNaN(d))
        .sort((a,b) => b - a)[0];
      setLastUpdated(newest || new Date());
      setErr("");
    } catch (e) {
      if (!silent) setErr(`Live data fetch failed: ${e.message}`);
      console.error(e);
    }
  }

  useEffect(() => {
    const t = setInterval(fetchLive, 15000);
    fetchLive();
    return () => clearInterval(t);
  }, []);

  /* ---------------- Repaint on data change ---------------- */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const ids = new Set([...Object.keys(buildingInfo), ...Object.keys(buildingColors)]);
    ids.forEach((id) => {
      const info  = buildingInfo[id];
      const color = buildingColors[id] || colorForStatus(statusFor(info));
      const nodes = findNodesForId(svg, id);       // exact by data-building-id
      nodes.forEach((node) => {
        if (!node.dataset.hmBound) {
          attachInteractions(node, id);
          node.dataset.hmBound = "1";
        }
        paintNodeDeep(node, color);
      });
    });
  }, [buildingInfo, buildingColors]);

  /* ---------------- Interactions ---------------- */
  function attachInteractions(node, id) {
    node.style.cursor = "pointer";
    node.classList.add("hm-building");

    node.addEventListener("mouseenter", () => nodeSetEmphasis(node, true));
    node.addEventListener("mouseleave", () => nodeSetEmphasis(node, false));
    node.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const infoNow  = infoRef.current?.[id];
      const status   = statusFor(infoNow);
      const colorNow = colorsRef.current?.[id] || colorForStatus(status);
      const anchor   = centerOfNodeInHost(node, hostRef.current);
      const occ      = infoNow ? occPct(infoNow) : null;

      setSelectedId(id);
      setPopup({
        id,
        name: infoNow?.name || id,
        current: infoNow?.current ?? null,
        capacity: infoNow?.capacity ?? null,
        occ,
        status,
        color: colorNow,
        x: anchor.x,
        y: anchor.y,
      });
    });
  }

  function refresh(){ fetchLive({ silent:true }); }

  function focusBuilding(b) {
    const svg = svgRef.current;
    if (!svg) return;
    const nodes = findNodesForId(svg, b.id);
    const node = nodes[0];
    if (!node) return;
    const anchor = centerOfNodeInHost(node, hostRef.current);
    setSelectedId(b.id);
    setPopup({
      id: b.id, name: b.name, current: b.current, capacity: b.capacity,
      occ: b.occ, status: b.status, color: b.color, x: anchor.x, y: anchor.y
    });
  }

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <img src="/logo.png" alt="" onError={(e)=>{ e.currentTarget.style.display='none'; }} />
        </div>
        <div className="actions">
          <div className="title">Crowd Heat Map</div>
          <div className="muted small">
            {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : "—"}
          </div>
          <button onClick={refresh} className="btn btn-primary">Refresh</button>
        </div>
      </header>

      <main className="stage">
        <div className="osm left"><iframe className="osm-frame" src={OSM_EMBED} title="Left map" /></div>

        <div className="center">
          <div ref={hostRef} className="svg-host" />
          <div className="legend-pill">
            <span className="chip" style={{ "--c": "#22c55e" }}>Low &lt;20%</span>
            <span className="chip" style={{ "--c": "#eab308" }}>Moderate &lt;50%</span>
            <span className="chip" style={{ "--c": "#f97316" }}>Busy &lt;70%</span>
            <span className="chip" style={{ "--c": "#ef4444" }}>High &lt;90%</span>
            <span className="chip" style={{ "--c": "#991b1b" }}>Critical ≥90%</span>
          </div>

          {popup && (
            <div className="popup"
                 style={{ left: Math.max(12, popup.x - 160), top: Math.max(12, popup.y - 18), borderColor: popup.color }}
                 role="dialog" aria-modal="false">
              <div className="popup-arrow" style={{ borderTopColor: popup.color }} />
              <div className="popup-hd" style={{ borderBottomColor: popup.color }}>
                <div className="pill" style={{ background: popup.color }}>{popup.id}</div>
                <div className="bname" title={popup.name}>{popup.name}</div>
                <button className="close" onClick={() => setPopup(null)} aria-label="Close">×</button>
              </div>
              <div className="popup-body">
                <Row label="Current visitors" value={numOrDash(popup.current)} />
                <Row label="Capacity"         value={numOrDash(popup.capacity)} />
                <Row label="Occupancy"        value={popup.occ != null ? `${popup.occ}%` : "—"} />
                <Row label="Status"           value={<b style={{ color: popup.color }}>{popup.status}</b>} />
              </div>
            </div>
          )}

          {err && <div className="banner error">{err}</div>}
        </div>

        <aside className="sidepanel">
          <div className="panel card">
            <div className="panel-title">Summary</div>
            <div className="stats">
              <div className="stat"><div className="stat-value">{totals.totalPeople}</div><div className="stat-label">People total</div></div>
              <div className="stat small"><span className="dot green" /> {totals.byStatus.Low} Low</div>
              <div className="stat small"><span className="dot yellow" /> {totals.byStatus.Moderate} Moderate</div>
              <div className="stat small"><span className="dot orange" /> {totals.byStatus.Busy} Busy</div>
              <div className="stat small"><span className="dot red" /> {totals.byStatus.High} High</div>
              <div className="stat small"><span className="dot darkred" /> {totals.byStatus.Critical} Critical</div>
            </div>
          </div>

          <div className="panel card">
            <input className="search" placeholder="Search buildings…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="panel card list">
            <div className="panel-title">Buildings</div>
            <div className="items">
              {filtered.map(b => {
                const active = b.id === selectedId;
                return (
                  <div key={b.id} className={`item ${active ? "active" : ""}`} onClick={() => focusBuilding(b)}>
                    <div className="item-row">
                      <div className="idpill">{b.id}</div>
                      <div className="name">{b.name}</div>
                      <div className="chip" style={{ background: b.color }}>{b.status}</div>
                    </div>
                    <div className="item-row">
                      <div className="count"><span className="count-num">{b.current ?? "—"}</span> people</div>
                      {b.occ != null && <div className="muted small">{b.occ}% occupancy</div>}
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && <div className="empty">No buildings match your search.</div>}
            </div>
          </div>

          <div className="panel footnote"><div className="muted small">Map © OpenStreetMap · Your SVG © You</div></div>
        </aside>

        <div className="osm right"><iframe className="osm-frame" src={OSM_EMBED} title="Right map" /></div>
      </main>

      <style>{`
        :root{ color-scheme: light; }
        *{scrollbar-color: #cbd5e1 #f8fafc;}
        *::-webkit-scrollbar{ width: 10px; height: 10px; }
        *::-webkit-scrollbar-track{ background: #f8fafc; }
        *::-webkit-scrollbar-thumb{ background: #cbd5e1; border-radius: 8px; border: 2px solid #f8fafc;}
        :root{ --bg:#f6f7fb; --card:#fff; --muted:#6b7280; --border:#e5e7eb; --shadow:0 16px 40px rgba(2,8,23,.10); }
        html, body, #root { height:100%; margin:0; }
        html, body { overflow:hidden; }
        body { font-family: 'Montserrat', ui-sans-serif, system-ui; color:#0f172a; background:var(--bg); }
        .page { display:grid; grid-template-rows:72px 1fr; height:100vh; }
        .topbar{ display:flex; align-items:center; justify-content:space-between; padding:0 16px; border-bottom:1px solid var(--border); background:#fff; }
        .brand{ display:flex; align-items:center; gap:12px; } .brand img{ width:34px; height:34px; object-fit:contain; }
        .title{ font-weight:800; letter-spacing:.2px; margin-right:12px; }
        .actions{ display:flex; align-items:center; gap:10px; } .muted{ color:var(--muted) } .small{ font-size:12px; }
        .btn{ appearance:none; border:1px solid var(--border); background:#111; color:#fff; border-radius:10px; padding:8px 12px; cursor:pointer; font-weight:600; }
        .stage{ display:grid; grid-template-columns: 1fr minmax(540px,760px) 360px 1fr; align-items:stretch; gap:12px; height:calc(100vh - 72px); padding:12px; }
        .osm{ position:relative; overflow:hidden; border-radius:12px; box-shadow:var(--shadow); border:1px solid var(--border); }
        .center{ position:relative; }
        .sidepanel{ display:flex; flex-direction:column; gap:12px; }
        .osm-frame{ position:absolute; inset:0; width:100%; height:100%; border:0; filter:saturate(.9) brightness(1); pointer-events:none; background:#eaf2ff; }
        .svg-host{ width:100%; height:100%; border-radius:12px; overflow:hidden; background:#fff; box-shadow:var(--shadow); border:1px solid var(--border); display:grid; place-items:center; }
        .svg-host svg{ width:100%; height:100%; display:block; transform-origin:center center; transform:scale(${MAP_SCALE}); }
        .legend-pill{ position:absolute; left:12px; bottom:12px; display:flex; gap:8px; background:#fff; border:1px solid var(--border); border-radius:999px; padding:6px 10px; box-shadow:var(--shadow); }
        .chip{ display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#111; padding:4px 10px; border-radius:999px; background:#f8fafc; border:1px solid var(--border); }
        .chip::before{ content:""; width:10px; height:10px; border-radius:50%; background: var(--c); box-shadow:0 0 0 3px color-mix(in srgb, var(--c), transparent 70%); }
        .popup{ position:absolute; width:320px; background:#fff; color:#111; border:2px solid; border-radius:12px; box-shadow:var(--shadow); animation:pop .14s ease-out; }
        @keyframes pop { from{ transform:translateY(4px); opacity:0 } to{ transform:none; opacity:1 } }
        .popup-arrow{ position:absolute; top:-10px; left:28px; width:0; height:0; border-left:10px solid transparent; border-right:10px solid transparent; border-top:10px solid; filter: drop-shadow(0 -2px 4px rgba(0,0,0,.08)); }
        .popup-hd{ display:flex; align-items:center; gap:10px; padding:10px 12px; border-bottom:2px solid; background:#fafafa; border-top-left-radius:10px; border-top-right-radius:10px; }
        .pill{ color:#fff; font-weight:800; padding:2px 8px; border-radius:999px; font-size:12px; }
        .bname{ font-weight:800; flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .close{ appearance:none; border:none; background:transparent; font-size:18px; line-height:1; cursor:pointer; color:#111; padding:0 4px; }
        .popup-body{ padding:10px 12px; display:grid; gap:8px; }
        .row{ display:flex; justify-content:space-between; font-size:14px; }
        .panel.card{ background:var(--card); border:1px solid var(--border); border-radius:12px; box-shadow:var(--shadow); padding:12px; }
        .panel .panel-title{ font-weight:700; margin-bottom:8px; }
        .stats{ display:grid; gap:8px; }
        .stat{ display:flex; align-items:baseline; gap:10px; } .stat .stat-value{ font-size:22px; font-weight:800; }
        .stat.small{ color:#374151; font-size:12px; display:flex; align-items:center; gap:6px; }
        .dot{ width:10px; height:10px; border-radius:50%; display:inline-block; }
        .dot.green{background:#22c55e;} .dot.yellow{background:#eab308;} .dot.orange{background:#f97316;}
        .dot.red{background:#ef4444;} .dot.darkred{background:#991b1b;}
        .search{ width:90%; padding:10px 10px; border-radius:10px; border:1px solid var(--border); outline:none; background: #fff; color: #0f1072a; }
        .list .items{ display:flex; flex-direction:column; gap:8px; }
        .item{ border:1px solid var(--border); border-radius:10px; padding:10px; display:flex; flex-direction:column; gap:6px; background:#fff; cursor:pointer; transition:transform .06s ease; }
        .item:hover{ transform:translateY(-1px); } .item.active{ outline:1px solid #111; }
        .item-row{ display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .idpill{ background:#111; color:#fff; padding:2px 10px; border-radius:999px; font-weight:700; font-size:12px; }
        .name{ font-weight:700; } .count{ color:#374151; font-size:13px; } .count-num{ font-weight:800; }
        .banner.error{ position:absolute; top:12px; left:12px; background:#fee2e2; color:#991b1b; border:1px solid #fecaca; padding:8px 12px; border-radius:10px; box-shadow:var(--shadow); }
        @media (max-width:1100px){ .stage{ grid-template-columns:0 minmax(520px,1fr) 340px 0; } .osm{ display:none; } }
        @media (max-width:780px){ .stage{ grid-template-columns:1fr; } .sidepanel{ order:3; } }
        .stage{ height:calc(100vh - 72px); min-height:0; }
        .center{ min-height:0; }
        .sidepanel{ display:flex; flex-direction:column; gap:12px; min-height:0; }
        .panel.card.list{flex:1 1 auto; display:flex; flex-direction:column; min-height:0; }
        .panel.card.list .items{ overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
        .panel.card.list .panel-title{ position:sticky; top:0; background:#fff; z-index:1; padding-bottom:8px; }
      `}</style>
    </div>
  );
}

/* ---------------- UI bits ---------------- */
function Row({ label, value }) {
  return <div className="row"><span>{label}</span><div>{value}</div></div>;
}
function numOrDash(n){ return (n || n === 0) ? n : "—"; }
function timeAgo(d){
  const s = Math.floor((Date.now() - d.getTime())/1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s/60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  return `${h}h ago`;
}

/* --------------- SVG helpers --------------- */
function expandUses(svg) {
  const ns = "http://www.w3.org/2000/svg";
  const uses = Array.from(svg.querySelectorAll("use"));
  uses.forEach((useEl) => {
    const href = useEl.getAttribute("href") || useEl.getAttribute("xlink:href");
    if (!href || !href.startsWith("#")) return;
    const refId = href.slice(1);
    const refEl = svg.getElementById(refId);
    if (!refEl) return;

    const g = document.createElementNS(ns, "g");
    g.setAttribute("data-building-id", refId);

    const x = parseFloat(useEl.getAttribute("x") || "0");
    const y = parseFloat(useEl.getAttribute("y") || "0");
    const t = useEl.getAttribute("transform") || "";
    const translate = (x || y) ? `translate(${x},${y})` : "";
    const combined = [translate, t].filter(Boolean).join(" ");
    if (combined) g.setAttribute("transform", combined);

    const style = useEl.getAttribute("style"); if (style) g.setAttribute("style", style);
    const cls = useEl.getAttribute("class");  if (cls) g.setAttribute("class", cls);

    if (refEl.tagName.toLowerCase() === "symbol") {
      Array.from(refEl.childNodes).forEach(n => g.appendChild(n.cloneNode(true)));
    } else {
      g.appendChild(refEl.cloneNode(true));
    }
    useEl.parentNode.replaceChild(g, useEl);
  });
}

function ensureViewBoxFitsContent(svg) {
  if (svg.hasAttribute("viewBox")) return;
  const shapes = Array.from(svg.querySelectorAll("path,polygon,rect,circle,ellipse,polyline,line"));
  if (shapes.length === 0) return;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  shapes.forEach((el) => {
    try {
      const b = el.getBBox();
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y);
      x2 = Math.max(x2, b.x + b.width); y2 = Math.max(y2, b.y + b.height);
    } catch {}
  });
  if (!isFinite(x1) || !isFinite(y1) || !isFinite(y2) || !isFinite(x2)) return;
  const pad = 8;
  svg.setAttribute("viewBox", `${x1 - pad} ${y1 - pad} ${(x2 - x1) + 2*pad} ${(y2 - y1) + 2*pad}`);
}

/* --------- Canonical building id tagging --------- */
function annotateCanonicalBuildingIds(svg) {
  const nodes = svg.querySelectorAll("[id]");
  nodes.forEach(el => {
    if (el.hasAttribute("data-building-id")) return;
    const canonical = canonicalFromAny(el.getAttribute("id"));
    if (canonical) el.setAttribute("data-building-id", canonical);
  });
}

/* Extract canonical Bnn or BnnX (X = A-Z) token from any id string. */
function canonicalFromAny(raw) {
  if (!raw) return null;
  const s = String(raw);
  const m = s.match(/(?:^|[^a-z0-9])(b\d{1,3}[a-z]?)(?![0-9a-z])/i);
  if (!m) return null;
  const token = m[1].toUpperCase(); // e.g., B12 or B12A
  const m2 = token.match(/^B0*([0-9]+)([A-Z]?)$/);
  if (!m2) return token;
  const num = m2[1].replace(/^0+/, "") || "0";
  const suf = m2[2] || "";
  return `B${num}${suf}`;
}

/* ----------- STRICT node lookup using canonical tag ----------- */
function findNodesForId(svg, wantId) {
  const nodes = [...svg.querySelectorAll(`[data-building-id="${cssAttr(wantId)}"]`)];
  if (nodes.length) return pruneToTopmost(nodes);
  const all = [...svg.querySelectorAll("[id]")].filter(el => canonicalFromAny(el.id) === wantId);
  return pruneToTopmost(all);
}

function pruneToTopmost(nodes) {
  const set = new Set(nodes);
  return nodes.filter(n => {
    for (let p = n.parentElement; p; p = p.parentElement) {
      if (set.has(p)) return false;
    }
    return true;
  });
}

/* --------------- paint & effects --------------- */
function paintNodeDeep(node, color) {
  const targets = isShape(node)
    ? [node]
    : Array.from(node.querySelectorAll("path,polygon,rect,circle,ellipse,polyline"));

  targets.forEach(el => {
    el.style.setProperty("fill", color, "important");
    el.style.setProperty("stroke", color, "important");
    el.style.setProperty("fill-opacity", String(FILL_OPACITY), "important");
    el.style.setProperty("stroke-width", String(STROKE_WIDTH));
    el.style.setProperty("transition", "fill .15s ease, fill-opacity .15s ease, stroke-width .15s ease");
    el.removeAttribute("fill");
    el.removeAttribute("stroke");
  });
}

function nodeSetEmphasis(node, on) {
  const targets = isShape(node)
    ? [node]
    : Array.from(node.querySelectorAll("path,polygon,rect,circle,ellipse,polyline"));
  targets.forEach(el => {
    el.style.setProperty("stroke-width", on ? STROKE_WIDTH * 1.9 : STROKE_WIDTH);
    el.style.setProperty("fill-opacity", on ? 0.52 : FILL_OPACITY);
    el.style.setProperty("filter", on ? "drop-shadow(0 12px 26px rgba(0,0,0,.25))" : "drop-shadow(0 6px 16px rgba(0,0,0,.20))");
  });
}

function isShape(node) { return /^(path|polygon|rect|circle|ellipse|polyline)$/i.test(node.tagName); }
function cssAttr(s) { return String(s).replace(/"/g, '\\"'); }
function centerOfNodeInHost(node, hostEl) {
  const nb = node.getBoundingClientRect();
  const hb = hostEl.getBoundingClientRect();
  return { x: nb.left + nb.width / 2 - hb.left, y: nb.top + nb.height / 2 - hb.top };
}

/* --------- status & color logic --------- */
function occPct(info) {
  if (!info || !info.capacity || (!Number.isFinite(info.current) && info.current !== 0)) return null;
  return Math.round((info.current / info.capacity) * 100);
}
function statusFor(info) {
  const p = occPct(info);
  if (p == null) return "Unknown";
  if (p < 20) return "Low";        // green
  if (p < 50) return "Moderate";   // yellow
  if (p < 70) return "Busy";       // orange
  if (p < 90) return "High";       // red
  return "Critical";               // dark red
}
function colorForStatus(status) {
  switch (status) {
    case "Low":       return "#22c55e"; // green
    case "Moderate":  return "#eab308"; // yellow
    case "Busy":      return "#f97316"; // orange
    case "High":      return "#ef4444"; // red
    case "Critical":  return "#991b1b"; // dark red
    default:          return "#94a3b8"; // slate (unknown)
  }
}
