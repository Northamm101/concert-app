const IC = {};
let cF = "all";
let cQ = "";
let activeScreen = "shows";

const VENUE_COORDS = {
  "CANADA LIFE CENTRE": { lat: 49.8927, lng: -97.1437 },
  "BURTON CUMMINGS THEATRE": { lat: 49.8915, lng: -97.1466 },
  "BLUE NOTE PARK": { lat: 49.8950, lng: -97.1380 },
  "RESORTS WORLD LAS VEGAS": { lat: 36.1475, lng: -115.1566 },
  "THE LINQ": { lat: 36.1162, lng: -115.1708 },
  "TARGET FIELD": { lat: 44.9817, lng: -93.2776 },
  "US BANK STADIUM": { lat: 44.9737, lng: -93.2576 },
  "SCOTIABANK ARENA": { lat: 43.6435, lng: -79.3791 },
  "ROGERS CENTRE": { lat: 43.6414, lng: -79.3894 },
  "COCA COLA COLISEUM": { lat: 43.6332, lng: -79.4186 },
  "ALERUS CENTER": { lat: 47.9214, lng: -97.0886 },
  "ALERUS CENTRE": { lat: 47.9214, lng: -97.0886 },
  "MOSAIC STADIUM": { lat: 50.4480, lng: -104.6332 },
  "CLUB REGENT EVENT CENTRE": { lat: 49.8957, lng: -97.0312 },
  "IG FIELD": { lat: 49.8079, lng: -97.1433 },
  "INVESTORS GROUP FIELD": { lat: 49.8079, lng: -97.1433 },
  "XCEL ENERGY CENTER": { lat: 44.9448, lng: -93.1010 },
  "ORLEANS ARENA": { lat: 36.1020, lng: -115.1782 },
  "CENTENNIAL CONCERT HALL": { lat: 49.8966, lng: -97.1403 },
  "KENASTON & STERLING LYON FIELD": { lat: 49.8444, lng: -97.2131 },
  "WINNIPEG STADIUM": { lat: 49.8725, lng: -97.1701 },
  "WINNIPEG CONVENTION CENTRE": { lat: 49.8894, lng: -97.1430 },
  "RBC CONVENTION CENTRE": { lat: 49.8894, lng: -97.1430 },
  "MTS CENTRE": { lat: 49.8927, lng: -97.1437 },
  "BELL MTS PLACE": { lat: 49.8927, lng: -97.1437 },
  "WINNIPEG ARENA": { lat: 49.8942, lng: -97.1674 },
  "FENWAY PARK": { lat: 42.3467, lng: -71.0972 },
  "WRIGLEY FIELD": { lat: 41.9484, lng: -87.6553 },
  "U.S. CELLULAR FIELD": { lat: 41.8299, lng: -87.6338 },
  "H.H.H. METRODOME": { lat: 44.9739, lng: -93.2580 },
  "MALL OF AMERICA FIELD": { lat: 44.9739, lng: -93.2580 },
  "FARGODOME": { lat: 46.9007, lng: -96.8003 },
  "SPORTS PAVILION": { lat: 44.9754, lng: -93.2368 },
  "UNIVERSITY OF MANITOBA": { lat: 49.8078, lng: -97.1336 },
  "LOVE THEATRE": { lat: 36.0955, lng: -115.1761 },
  "LE THEATRE DES ARTS": { lat: 36.1181, lng: -115.1714 },
  "T-MOBILE ARENA": { lat: 36.1028, lng: -115.1781 },
  "AIR CANADA CENTRE": { lat: 43.6435, lng: -79.3791 },
  "MGM GRAND": { lat: 36.1025, lng: -115.1696 },
  "THE ZOO (BAR)": { lat: 49.8970, lng: -97.1405 }
};

function normalizeVenueName(venueString) {
  return venueString.split("·")[0].trim().toUpperCase();
}

function extractVenueLocation(venueString) {
  const parts = venueString.split("·").map(p => p.trim());
  return {
    name: parts[0] || venueString,
    location: parts[1] || ""
  };
}

async function getImg(s) {
  const k = s.a;
  if (IC[k] !== undefined) return IC[k];

  const t = s.img || s.a;
  let u = null;

  try {
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(t)}&media=music&entity=musicArtist&limit=1`,
      { signal: AbortSignal.timeout(4000) }
    );
    const d = await r.json();
    if (d.results?.[0]?.artworkUrl100) {
      u = d.results[0].artworkUrl100.replace("100x100", "600x600");
    }
  } catch (e) {}

  if (!u) {
    try {
      const r = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=artist.search&artist=${encodeURIComponent(t)}&api_key=3a98c11594fa2a4c22f0a3faeddb8f32&format=json&limit=1`,
        { signal: AbortSignal.timeout(4000) }
      );
      const d = await r.json();
      const m = d?.results?.artistmatches?.artist;
      if (m?.length) {
        const xl = m[0].image?.find(i => i.size === "extralarge" || i.size === "large");
        if (xl?.["#text"]?.length > 10) u = xl["#text"];
      }
    } catch (e) {}
  }

  IC[k] = u || "none";
  return u;
}

function applyImg(u, cid, modal) {
  if (cid) {
    const el = document.getElementById(cid);
    if (!el) return;
    const img = el.querySelector(".gig-poster-img");
    if (!img) return;
    el.classList.remove("shim");
    img.onload = () => img.classList.add("loaded");
    img.onerror = () => el.classList.remove("shim");
    img.src = u;
  }

  if (modal) {
    const img = document.getElementById("mpi");
    if (!img) return;
    img.onload = () => {
      img.classList.add("loaded");
      document.getElementById("mpej").style.opacity = "0";
    };
    img.onerror = () => {};
    img.src = u;
  }
}

async function loadImg(s, cid, modal) {
  const u = await getImg(s);
  if (u && u !== "none") applyImg(u, cid, modal);
  else if (cid) {
    const el = document.getElementById(cid);
    if (el) el.classList.remove("shim");
  }
}

function getVisibleEvents() {
  return S.filter(s => {
    const tabMatch = cF === "all" || s.t === cF;
    const q = cQ.trim().toLowerCase();
    const searchMatch =
      !q ||
      s.a.toLowerCase().includes(q) ||
      s.v.toLowerCase().includes(q) ||
      (s.o && s.o.toLowerCase().includes(q)) ||
      String(s.y).includes(q);

    return tabMatch && searchMatch;
  });
}

function updateStats(a) {
  document.getElementById("sT").textContent = a.length;
  document.getElementById("sC").textContent = a.filter(s => s.t === "cancelled").length;
  document.getElementById("sV").textContent = new Set(a.map(s => normalizeVenueName(s.v))).size;
  document.getElementById("sY").textContent = new Set(a.map(s => s.y)).size;
}

function render() {
  const list = document.getElementById("gl");
  list.innerHTML = "";
  let cY = null;

  const vis = getVisibleEvents();
  updateStats(vis);

  if (!vis.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-family:'DM Mono',monospace;font-size:13px">No events found</div>`;
    renderStats();
    renderMap();
    return;
  }

  vis.forEach(s => {
    const idx = S.indexOf(s);
    if (s.y !== cY) {
      cY = s.y;
      const d = document.createElement("div");
      d.className = "year-div";
      d.textContent = s.y;
      list.appendChild(d);
    }

    const num = S.length - idx;
    const cid = `p${idx}`;

    const card = document.createElement("div");
    card.className = `gig-card ${s.t}`;
    card.innerHTML = `
      <div class="gig-poster shim" id="${cid}">
        <div class="gig-poster-bg" style="background:linear-gradient(135deg,${s.g})"></div>
        <img class="gig-poster-img" alt="">
        <span class="gig-poster-emoji">${s.e}</span>
      </div>
      <div class="gig-info">
        <div class="gig-artist">${s.a}</div>
        ${s.o ? `<div class="gig-openers">${s.o}</div>` : ""}
        <div class="gig-meta">${s.d} · ${extractVenueLocation(s.v).name}</div>
        <div class="gig-tags">${s.tags.map(t => `<span class="tag ${t[0]}">${t[1]}</span>`).join("")}</div>
      </div>
      <div class="gig-right">
        <span class="gig-arrow">→</span>
        <div class="gig-num">#${num}</div>
      </div>
    `;

    card.onclick = () => openModal(s, num);
    list.appendChild(card);
    loadImg(s, cid, false);
  });

  renderStats();
  renderMap();
}

function openModal(s, num) {
  document.getElementById("mpej").textContent = s.e;
  document.getElementById("mpej").style.opacity = "1";
  document.getElementById("mTitle").textContent = s.a;
  document.getElementById("mSub").textContent = s.o || "";
  document.getElementById("mVenue").textContent = `${s.d} · ${s.v}`;
  document.getElementById("mPoster").style.background = `linear-gradient(135deg,${s.g})`;

  const mi = document.getElementById("mpi");
  mi.classList.remove("loaded");
  mi.src = "";
  loadImg(s, null, true);

  const tl = {
    concert: "Concert",
    sport: "Sport",
    wrestling: "Wrestling",
    festival: "Festival",
    comedy: "Comedy",
    theatre: "Theatre",
    kids: "Kids Show",
    curling: "Curling",
    cancelled: "Cancelled"
  };

  document.getElementById("mBody").innerHTML = `
    <div class="msec">
      <div class="msec-title">Event Details</div>
      <div class="irow"><span class="ikey">Date</span><span class="ival">${s.d}</span></div>
      <div class="irow"><span class="ikey">Venue</span><span class="ival">${s.v}</span></div>
      ${s.o ? `<div class="irow"><span class="ikey">Support</span><span class="ival">${s.o}</span></div>` : ""}
      <div class="irow"><span class="ikey">Category</span><span class="ival">${tl[s.t] || s.t}</span></div>
      <div class="irow"><span class="ikey">Entry</span><span class="ival" style="color:var(--cyan)">#${num} in GigBook</span></div>
    </div>

    <div class="msec">
      <div class="msec-title">Tags</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${s.tags.map(t => `<span class="tag ${t[0]}" style="font-size:11px;padding:4px 10px">${t[1]}</span>`).join("")}
      </div>
    </div>

    <div class="msec" style="display:flex;gap:10px">
      <div onclick="toast('📷 Photos — coming!')" style="flex:1;background:rgba(0,229,200,.08);border:1px solid rgba(0,229,200,.2);border-radius:10px;padding:12px;text-align:center;cursor:pointer">
        <div style="font-size:22px">📷</div>
        <div style="font-size:11px;color:var(--cyan);font-family:'DM Mono',monospace;margin-top:4px">Photos</div>
      </div>
      <div onclick="toast('🎟 Ticket — coming!')" style="flex:1;background:rgba(245,166,35,.08);border:1px solid rgba(245,166,35,.2);border-radius:10px;padding:12px;text-align:center;cursor:pointer">
        <div style="font-size:22px">🎟</div>
        <div style="font-size:11px;color:var(--amber);font-family:'DM Mono',monospace;margin-top:4px">Ticket</div>
      </div>
      <div onclick="toast('📝 Notes — coming!')" style="flex:1;background:rgba(192,132,252,.08);border:1px solid rgba(192,132,252,.2);border-radius:10px;padding:12px;text-align:center;cursor:pointer">
        <div style="font-size:22px">📝</div>
        <div style="font-size:11px;color:var(--purple);font-family:'DM Mono',monospace;margin-top:4px">Notes</div>
      </div>
    </div>
  `;

  document.getElementById("mo").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  document.getElementById("mo").classList.remove("open");
  document.body.style.overflow = "";
}

document.getElementById("mo").addEventListener("click", e => {
  if (e.target === document.getElementById("mo")) closeModal();
});

function setTab(el, t) {
  document.querySelectorAll(".ribbon-tab").forEach(x => x.classList.remove("active"));
  el.classList.add("active");
  cF = t;
  render();
}

function toggleSearch() {
  const b = document.getElementById("sb");
  b.classList.toggle("vis");

  if (b.classList.contains("vis")) {
    document.getElementById("si").focus();
  } else {
    document.getElementById("si").value = "";
    cQ = "";
    render();
  }
}

function doSearch(v) {
  cQ = v.toLowerCase();
  render();
}

function switchScreen(screen, el) {
  activeScreen = screen;

  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(`screen-${screen}`).classList.add("active");

  document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
  const nav = el || document.querySelector(`.nav-item[data-screen="${screen}"]`);
  if (nav) nav.classList.add("active");

  if (screen === "map") renderMap();
  if (screen === "stats") renderStats();
}

function toast(m) {
  const t = document.getElementById("te");
  t.textContent = m;
  t.classList.add("show");
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove("show"), 2500);
}

function getVenueGroups() {
  const groups = {};

  getVisibleEvents().forEach(event => {
    const venueName = normalizeVenueName(event.v);
    const venueParts = extractVenueLocation(event.v);

    if (!groups[venueName]) {
      const coords = VENUE_COORDS[venueName] || null;
      groups[venueName] = {
        key: venueName,
        displayName: venueParts.name,
        location: venueParts.location,
        coords,
        events: []
      };
    }

    groups[venueName].events.push(event);
  });

  return Object.values(groups)
    .filter(group => group.coords)
    .sort((a, b) => b.events.length - a.events.length || a.displayName.localeCompare(b.displayName));
}

function latLngToXY(lat, lng, bounds) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 100;
  const y = 100 - ((lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * 100;

  return {
    x: Math.min(96, Math.max(4, x)),
    y: Math.min(94, Math.max(8, y))
  };
}

function renderMap() {
  const mapStage = document.getElementById("mapStage");
  const details = document.getElementById("mapVenueDetails");
  if (!mapStage || !details) return;

  const groups = getVenueGroups();
  mapStage.innerHTML = "";

  if (!groups.length) {
    mapStage.innerHTML = `<div class="empty-state" style="height:100%;">No mapped venues for this filter.</div>`;
    details.innerHTML = `Tap a pin to see venue history.`;
    return;
  }

  const lats = groups.map(g => g.coords.lat);
  const lngs = groups.map(g => g.coords.lng);

  const bounds = {
    minLat: Math.min(...lats) - 2,
    maxLat: Math.max(...lats) + 2,
    minLng: Math.min(...lngs) - 3,
    maxLng: Math.max(...lngs) + 3
  };

  groups.forEach((group, index) => {
    const pt = latLngToXY(group.coords.lat, group.coords.lng, bounds);
    const pin = document.createElement("button");
    pin.className = "map-pin";
    pin.style.left = `${pt.x}%`;
    pin.style.top = `${pt.y}%`;
    pin.title = `${group.displayName} (${group.events.length})`;

    pin.onclick = () => {
      document.querySelectorAll(".map-pin").forEach(p => p.classList.remove("active"));
      pin.classList.add("active");
      renderVenueDetails(group);
    };

    mapStage.appendChild(pin);

    if (index === 0) {
      setTimeout(() => {
        pin.classList.add("active");
        renderVenueDetails(group);
      }, 0);
    }
  });

  const legend = document.createElement("div");
  legend.className = "map-legend";
  legend.innerHTML = `
    <div class="map-legend-chip">${groups.length} venues</div>
    <div class="map-legend-chip">${getVisibleEvents().length} visible events</div>
  `;
  mapStage.appendChild(legend);
}

function renderVenueDetails(group) {
  const details = document.getElementById("mapVenueDetails");
  details.innerHTML = `
    <div class="venue-title">${group.displayName}</div>
    <div class="venue-meta">${group.location} · ${group.events.length} event${group.events.length === 1 ? "" : "s"}</div>
    <div class="venue-list">
      ${group.events.map(e => `
        <div class="venue-event">
          <div class="venue-event-title">${e.a}</div>
          <div class="venue-event-meta">${e.d} · ${e.t.toUpperCase()}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStats() {
  const box = document.getElementById("statsContent");
  if (!box) return;

  const visible = getVisibleEvents();
  const venueCounts = {};
  const artistCounts = {};
  const categoryCounts = {};

  visible.forEach(e => {
    const venue = normalizeVenueName(e.v);
    venueCounts[venue] = (venueCounts[venue] || 0) + 1;
    artistCounts[e.a] = (artistCounts[e.a] || 0) + 1;
    categoryCounts[e.t] = (categoryCounts[e.t] || 0) + 1;
  });

  const topVenue = Object.entries(venueCounts).sort((a, b) => b[1] - a[1])[0];
  const topArtist = Object.entries(artistCounts).sort((a, b) => b[1] - a[1])[0];
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];
  const firstYear = visible.length ? Math.min(...visible.map(e => e.y)) : "—";
  const latestYear = visible.length ? Math.max(...visible.map(e => e.y)) : "—";

  box.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-title">Visible Events</div>
      <div class="stat-box-value">${visible.length}</div>
      <div class="stat-box-sub">Based on your current filters and search.</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Years Covered</div>
      <div class="stat-box-value">${new Set(visible.map(e => e.y)).size}</div>
      <div class="stat-box-sub">${firstYear} to ${latestYear}</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Top Venue</div>
      <div class="stat-box-value">${topVenue ? topVenue[1] : 0}</div>
      <div class="stat-box-sub">${topVenue ? topVenue[0] : "—"}</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Top Artist / Event</div>
      <div class="stat-box-value">${topArtist ? topArtist[1] : 0}</div>
      <div class="stat-box-sub">${topArtist ? topArtist[0] : "—"}</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Top Category</div>
      <div class="stat-box-value">${topCategory ? topCategory[1] : 0}</div>
      <div class="stat-box-sub">${topCategory ? topCategory[0] : "—"}</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Cancelled</div>
      <div class="stat-box-value">${visible.filter(e => e.t === "cancelled").length}</div>
      <div class="stat-box-sub">Visible cancelled or missed events.</div>
    </div>
  `;
}

render();
renderStats();
renderMap();