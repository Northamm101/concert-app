const IC = {};
let cF = "all";
let cQ = "";
let activeScreen = "shows";

const VENUE_ALIASES = {
  "MTS CENTRE": "CANADA LIFE CENTRE",
  "BELL MTS PLACE": "CANADA LIFE CENTRE"
};

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
  const raw = venueString.split("·")[0].trim().toUpperCase();
  return VENUE_ALIASES[raw] || raw;
}

function extractVenueLocation(venueString) {
  const parts = venueString.split("·").map(p => p.trim());
  let displayName = parts[0] || venueString;
  const normalized = normalizeVenueName(venueString);

  if (normalized === "CANADA LIFE CENTRE") {
    displayName = "Canada Life Centre";
  }

  return {
    name: displayName,
    location: parts[1] || ""
  };
}

function eventSortableDate(s) {
  if (s.isoDate) return new Date(`${s.isoDate}T12:00:00`);
  return new Date(`${s.y}-01-01T12:00:00`);
}

function isFutureEvent(s) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventSortableDate(s) >= today;
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

function renderUpcoming(events) {
  const upcomingList = document.getElementById("upcomingList");
  if (!upcomingList) return;

  upcomingList.innerHTML = "";

  if (!events.length) {
    upcomingList.innerHTML = `<div class="coming-card" style="margin:0 20px 0 20px;">No upcoming events yet.</div>`;
    return;
  }

  events
    .sort((a, b) => eventSortableDate(a) - eventSortableDate(b))
    .forEach(s => {
      const card = document.createElement("div");
      card.className = "upcoming-card";
      card.innerHTML = `
        <div class="up-date">${s.d}</div>
        <div class="up-artist">${s.a}</div>
        <div class="up-openers">${s.o || ""}</div>
        <div class="up-venue">${extractVenueLocation(s.v).name}${extractVenueLocation(s.v).location ? " · " + extractVenueLocation(s.v).location : ""}</div>
        <div class="up-actions">
          <button class="up-btn primary" onclick="toast('📸 Friends Group!')">Friends</button>
          <button class="up-btn" onclick="toast('🎵 Setlist!')">Setlist</button>
          <button class="up-btn" onclick="switchScreen('map')">Map</button>
        </div>
      `;
      upcomingList.appendChild(card);
    });
}

function render() {
  const list = document.getElementById("gl");
  list.innerHTML = "";
  let cY = null;

  const vis = getVisibleEvents();
  updateStats(vis);

  const upcomingEvents = vis.filter(isFutureEvent);
  const pastEvents = vis.filter(s => !isFutureEvent(s))
    .sort((a, b) => eventSortableDate(b) - eventSortableDate(a));

  renderUpcoming(upcomingEvents);

  if (!pastEvents.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-family:'DM Mono',monospace;font-size:13px">No past events found</div>`;
    renderStats();
    renderMap();
    return;
  }

  pastEvents.forEach(s => {
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
  document.getElementById("mVenue").textContent = `${s.d} · ${extractVenueLocation(s.v).name}${extractVenueLocation(s.v).location ? " · " + extractVenueLocation(s.v).location : ""}`;
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
      <div class="irow"><span class="ikey">Venue</span><span class="ival">${extractVenueLocation(s.v).name}${extractVenueLocation(s.v).location ? " · " + extractVenueLocation(s.v).location : ""}</span></div>
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
    const venueKey = normalizeVenueName(event.v);
    const venueParts = extractVenueLocation(event.v);

    if (!groups[venueKey]) {
      const coords = VENUE_COORDS[venueKey] || null;
      groups[venueKey] = {
        key: venueKey,
        displayName: venueParts.name,
        location: venueParts.location,
        coords,
        events: []
      };
    }

    groups[venueKey].events.push(event);
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
  const sortedEvents = [...group.events].sort((a, b) => eventSortableDate(b) - eventSortableDate(a));

  details.innerHTML = `
    <div class="venue-title">${group.displayName}</div>
    <div class="venue-meta">${group.location} · ${sortedEvents.length} event${sortedEvents.length === 1 ? "" : "s"}</div>
    <div class="venue-list">
      ${sortedEvents.map(e => `
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
    const displayVenue = venue === "CANADA LIFE CENTRE" ? "Canada Life Centre" : venue;
    venueCounts[displayVenue] = (venueCounts[displayVenue] || 0) + 1;
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

function openAddEventModal() {
  clearAddEventForm();
  document.getElementById("addEventOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeAddEventModal() {
  document.getElementById("addEventOverlay").classList.remove("open");
  document.body.style.overflow = "";
  clearAddEventForm();
}

function clearAddEventForm() {
  document.getElementById("aeTitle").value = "";
  document.getElementById("aeSupport").value = "";
  document.getElementById("aeDate").value = "";
  document.getElementById("aeVenue").value = "";
  document.getElementById("aeLocation").value = "";
  document.getElementById("aeCategory").value = "concert";
  document.getElementById("aeTag").value = "";
}

function formatDateLabel(dateValue) {
  if (!dateValue) return "DATE TBD";
  const d = new Date(dateValue + "T12:00:00");
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];
  return `${months[d.getMonth()]} ${d.getDate()} · ${d.getFullYear()}`;
}

function getCategoryStyle(category) {
  const map = {
    concert: { emoji: "🎸", gradient: "#051a10,#0d0520", tagClass: "tc", tagText: "Concert" },
    sport: { emoji: "🏒", gradient: "#001a10,#1a0020", tagClass: "tb", tagText: "Sport" },
    wrestling: { emoji: "🤼", gradient: "#1a0800,#0a0a0a", tagClass: "to", tagText: "Wrestling" },
    festival: { emoji: "🎡", gradient: "#1a1000,#051a10", tagClass: "tp", tagText: "Festival" },
    comedy: { emoji: "😂", gradient: "#1a1505,#051a15", tagClass: "ty", tagText: "Comedy" },
    theatre: { emoji: "🎭", gradient: "#05051a,#1a051a", tagClass: "to", tagText: "Theatre" },
    kids: { emoji: "🧸", gradient: "#1a0520,#051a15", tagClass: "tk", tagText: "Kids Show" },
    curling: { emoji: "🥌", gradient: "#051a15,#1a0510", tagClass: "tg", tagText: "Curling" },
    cancelled: { emoji: "❌", gradient: "#200505,#050520", tagClass: "tr", tagText: "Cancelled" }
  };
  return map[category] || map.concert;
}

function saveNewEvent() {
  const title = document.getElementById("aeTitle").value.trim();
  const support = document.getElementById("aeSupport").value.trim();
  const dateValue = document.getElementById("aeDate").value;
  const venue = document.getElementById("aeVenue").value.trim();
  const location = document.getElementById("aeLocation").value.trim();
  const category = document.getElementById("aeCategory").value;
  const extraTag = document.getElementById("aeTag").value.trim();

  if (!title || !dateValue || !venue || !location) {
    toast("Please fill in title, date, venue, and location.");
    return;
  }

  const style = getCategoryStyle(category);
  const year = new Date(dateValue + "T12:00:00").getFullYear();
  const venueUpper = venue.toUpperCase();
  const locationUpper = location.toUpperCase();
  const venueKey = VENUE_ALIASES[venueUpper] || venueUpper;
  const displayVenue = venueKey === "CANADA LIFE CENTRE" ? "CANADA LIFE CENTRE" : venueUpper;

  const newEvent = {
    a: title,
    o: support,
    d: formatDateLabel(dateValue),
    isoDate: dateValue,
    v: `${displayVenue} · ${locationUpper}`,
    t: category,
    e: style.emoji,
    g: style.gradient,
    tags: [[style.tagClass, style.tagText]],
    y: year
  };

  if (extraTag) {
    newEvent.tags.push(["ta", extraTag]);
  }

  S.unshift(newEvent);

  closeAddEventModal();
  render();
  switchScreen("shows");
  toast("Event added to GigBook");
}

document.getElementById("addEventOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("addEventOverlay")) {
    closeAddEventModal();
  }
});

render();
renderStats();
renderMap();