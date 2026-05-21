const IC = {};
let cF = "all";
let cQ = "";
let activeScreen = "shows";
let activeStatsTab = "overall";
let activeSportStatsTab = "hockey";

const STORAGE_KEY = "gigbook_custom_events_v1";

const VENUE_ALIASES = {
  "MTS CENTRE": "CANADA LIFE CENTRE",
  "BELL MTS PLACE": "CANADA LIFE CENTRE",
  "CREDIT UNION CENTRE": "SASKTEL CENTRE",
  "H.H.H. METRODOME": "MALL OF AMERICA FIELD",
  "MALL OF AMERICA FIELD": "MALL OF AMERICA FIELD",
  "ALERUS CENTRE": "ALERUS CENTER",
  "WINNIPEG CONVENTION CENTRE": "RBC CONVENTION CENTRE",
  "IG FIELD": "PRINCESS AUTO STADIUM",
  "INVESTORS GROUP FIELD": "PRINCESS AUTO STADIUM"
};

const VENUE_COORDS = {
  "CANADA LIFE CENTRE": { lat: 49.8927, lng: -97.1437 },
  "BURTON CUMMINGS THEATRE": { lat: 49.8915, lng: -97.1466 },
  "BLUE NOTE PARK": { lat: 49.8950, lng: -97.1380 },
  "RESORTS WORLD LAS VEGAS": { lat: 36.1475, lng: -115.1566 },
  "THE LINQ": { lat: 36.1162, lng: -115.1708 },
  "TARGET FIELD": { lat: 44.9817, lng: -93.2776 },
  "TARGET CENTER": { lat: 44.9795, lng: -93.2760 },
  "US BANK STADIUM": { lat: 44.9737, lng: -93.2576 },
  "SCOTIABANK ARENA": { lat: 43.6435, lng: -79.3791 },
  "ROGERS CENTRE": { lat: 43.6414, lng: -79.3894 },
  "COCA COLA COLISEUM": { lat: 43.6332, lng: -79.4186 },
  "ALERUS CENTER": { lat: 47.9214, lng: -97.0886 },
  "MOSAIC STADIUM": { lat: 50.4480, lng: -104.6332 },
  "CLUB REGENT EVENT CENTRE": { lat: 49.8957, lng: -97.0312 },
  "PRINCESS AUTO STADIUM": { lat: 49.8079, lng: -97.1433 },
  "XCEL ENERGY CENTER": { lat: 44.9448, lng: -93.1010 },
  "ORLEANS ARENA": { lat: 36.1020, lng: -115.1782 },
  "CENTENNIAL CONCERT HALL": { lat: 49.8966, lng: -97.1403 },
  "KENASTON & STERLING LYON FIELD": { lat: 49.8444, lng: -97.2131 },
  "WINNIPEG STADIUM": { lat: 49.8811, lng: -97.1975 },
  "RBC CONVENTION CENTRE": { lat: 49.8894, lng: -97.1430 },
  "FENWAY PARK": { lat: 42.3467, lng: -71.0972 },
  "WRIGLEY FIELD": { lat: 41.9484, lng: -87.6553 },
  "U.S. CELLULAR FIELD": { lat: 41.8299, lng: -87.6338 },
  "MALL OF AMERICA FIELD": { lat: 44.9739, lng: -93.2580 },
  "FARGODOME": { lat: 46.9007, lng: -96.8003 },
  "SPORTS PAVILION": { lat: 44.9754, lng: -93.2368 },
  "UNIVERSITY OF MANITOBA": { lat: 49.8078, lng: -97.1336 },
  "LOVE THEATRE": { lat: 36.0955, lng: -115.1761 },
  "LE THEATRE DES ARTS": { lat: 36.1181, lng: -115.1714 },
  "T-MOBILE ARENA": { lat: 36.1028, lng: -115.1781 },
  "AIR CANADA CENTRE": { lat: 43.6435, lng: -79.3791 },
  "MGM GRAND": { lat: 36.1025, lng: -115.1696 },
  "THE ZOO (BAR)": { lat: 49.8970, lng: -97.1405 },
  "MANITOBA MUSEUM": { lat: 49.8996, lng: -97.1374 },
  "SASKTEL CENTRE": { lat: 52.1570, lng: -106.7204 },
  "ST. PETE TIMES FORUM": { lat: 27.9427, lng: -82.4518 }
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

  const raw = (s.d || "").toUpperCase().trim();
  const monthMap = {
    JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
    JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
  };

  const match = raw.match(/(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2}).*?(\d{4})/);

  if (match) {
    const month = monthMap[match[1]];
    const day = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    return new Date(year, month, day, 12, 0, 0);
  }

  return new Date(`${s.y || 1900}-01-01T12:00:00`);
}

function isFutureEvent(s) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return eventSortableDate(s) >= today;
}

function eventKey(s) {
  return [
    s.a || "",
    s.d || "",
    s.v || "",
    s.t || "",
    s.o || "",
    s.isoDate || ""
  ].join("||");
}

function buildDisplayNumberMap() {
  const sortedAll = [...S].sort((a, b) => eventSortableDate(b) - eventSortableDate(a));
  const map = new Map();

  sortedAll.forEach((event, index) => {
    map.set(eventKey(event), sortedAll.length - index);
  });

  return map;
}

function getStoredCustomEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Could not read stored GigBook events:", error);
    return [];
  }
}

function saveStoredCustomEvents(events) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error("Could not save GigBook events:", error);
    toast("Could not save event on this device.");
  }
}

function mergeStoredEventsIntoS() {
  const stored = getStoredCustomEvents();
  const existingKeys = new Set(S.map(eventKey));

  stored.forEach(ev => {
    const key = eventKey(ev);
    if (!existingKeys.has(key)) {
      S.push(ev);
      existingKeys.add(key);
    }
  });
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
  const numberMap = buildDisplayNumberMap();
  updateStats(vis);

  const upcomingEvents = vis.filter(isFutureEvent);
  const pastEvents = vis
    .filter(s => !isFutureEvent(s))
    .sort((a, b) => eventSortableDate(b) - eventSortableDate(a));

  renderUpcoming(upcomingEvents);

  if (!pastEvents.length) {
    list.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-family:'DM Mono',monospace;font-size:13px">No past events found</div>`;
    renderStats();
    renderMap();
    return;
  }

  pastEvents.forEach(s => {
    const num = numberMap.get(eventKey(s)) || 0;
    const cid = `p${num}`;

    if (s.y !== cY) {
      cY = s.y;
      const d = document.createElement("div");
      d.className = "year-div";
      d.textContent = s.y;
      list.appendChild(d);
    }

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
    const originalVenue = event.v.split("·")[0].trim();
    const venueKey = normalizeVenueName(event.v);
    const venueParts = extractVenueLocation(event.v);

    if (!groups[venueKey]) {
      const coords = VENUE_COORDS[venueKey] || null;
      groups[venueKey] = {
        key: venueKey,
        displayName: titleCase(venueKey),
        location: venueParts.location,
        coords,
        events: [],
        historicalNames: {}
      };
    }

    groups[venueKey].events.push(event);

    if (!groups[venueKey].historicalNames[originalVenue]) {
      groups[venueKey].historicalNames[originalVenue] = [];
    }

    groups[venueKey].historicalNames[originalVenue].push(event);
  });

  Object.values(groups).forEach(group => {
    if (group.key === "CANADA LIFE CENTRE") group.displayName = "Canada Life Centre";
    if (group.key === "SASKTEL CENTRE") group.displayName = "SaskTel Centre";
    if (group.key === "MALL OF AMERICA FIELD") group.displayName = "Mall of America Field";
    if (group.key === "ALERUS CENTER") group.displayName = "Alerus Center";
    if (group.key === "RBC CONVENTION CENTRE") group.displayName = "RBC Convention Centre";
    if (group.key === "PRINCESS AUTO STADIUM") group.displayName = "Princess Auto Stadium";
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

let gigbookLeafletMap = null;
let gigbookLeafletMarkers = null;

function renderMap() {
  const mapEl = document.getElementById("leafletMap");
  const details = document.getElementById("mapVenueDetails");
  if (!mapEl || !details || typeof L === "undefined") return;

  const groups = getVenueGroups();

  if (!gigbookLeafletMap) {
    gigbookLeafletMap = L.map("leafletMap", {
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "&copy; OpenStreetMap contributors"
    }).addTo(gigbookLeafletMap);

    gigbookLeafletMarkers = L.layerGroup().addTo(gigbookLeafletMap);
  }

  gigbookLeafletMarkers.clearLayers();

  if (!groups.length) {
    details.innerHTML = `Tap a marker to see venue history.`;
    gigbookLeafletMap.setView([49.8951, -97.1384], 3);
    setTimeout(() => gigbookLeafletMap.invalidateSize(), 50);
    return;
  }

  const bounds = [];

  groups.forEach((group, index) => {
    if (!group.coords) return;

    const marker = L.marker([group.coords.lat, group.coords.lng]).addTo(gigbookLeafletMarkers);

    marker.bindPopup(`
      <div class="custom-map-popup-title">${group.displayName}</div>
      <div class="custom-map-popup-sub">${group.location} · ${group.events.length} event${group.events.length === 1 ? "" : "s"}</div>
    `);

    marker.on("click", () => {
      renderVenueDetails(group);
    });

    bounds.push([group.coords.lat, group.coords.lng]);

    if (index === 0) {
      renderVenueDetails(group);
    }
  });

  if (bounds.length === 1) {
  gigbookLeafletMap.setView(bounds[0], 8);
} else {
  gigbookLeafletMap.fitBounds(bounds, { padding: [40, 40] });
  if (gigbookLeafletMap.getZoom() > 4) {
    gigbookLeafletMap.setZoom(4);
  }
}

  setTimeout(() => gigbookLeafletMap.invalidateSize(), 50);
}

function renderVenueDetails(group) {
  const details = document.getElementById("mapVenueDetails");

  const historicalSections = Object.entries(group.historicalNames || {})
    .sort((a, b) => {
      const aLatest = Math.max(...a[1].map(e => eventSortableDate(e).getTime()));
      const bLatest = Math.max(...b[1].map(e => eventSortableDate(e).getTime()));
      return bLatest - aLatest;
    })
    .map(([venueName, events]) => {
      const sortedEvents = [...events].sort((a, b) => eventSortableDate(b) - eventSortableDate(a));

      return `
        <div class="venue-history-block">
          <div class="venue-history-title">${venueName}</div>
          <div class="venue-list">
            ${sortedEvents.map(e => `
              <div class="venue-event">
                <div class="venue-event-title">${e.a}</div>
                <div class="venue-event-meta">${e.d} · ${e.t.toUpperCase()}</div>
              </div>
            `).join("")}
          </div>
        </div>
      `;
    }).join("");

  details.innerHTML = `
    <div class="venue-title">${group.displayName}</div>
    <div class="venue-meta">${group.location} · ${group.events.length} event${group.events.length === 1 ? "" : "s"}</div>
    ${historicalSections}
  `;
}

function titleCase(text) {
  if (!text) return "";
  return text
    .toLowerCase()
    .split(" ")
    .map(word => word ? word[0].toUpperCase() + word.slice(1) : "")
    .join(" ");
}

function extractRegionFromLocation(location) {
  if (!location) return "";
  const parts = location.split(",").map(p => p.trim());
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function extractCountryFromLocation(location) {
  if (!location) return "Unknown";
  const region = extractRegionFromLocation(location).toUpperCase();

  const usStates = new Set([
    "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
    "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
    "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
  ]);

  const canadaRegions = new Set([
    "MB","ON","SK","AB","BC","QC","NB","NS","PE","NL","NT","NU","YT"
  ]);

  if (usStates.has(region)) return "United States";
  if (canadaRegions.has(region)) return "Canada";
  return "Unknown";
}

function countItems(items) {
  const counts = {};
  items.forEach(item => {
    if (!item) return;
    counts[item] = (counts[item] || 0) + 1;
  });
  return counts;
}

function topNEntries(counts, n = 5) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n);
}

function renderListCard(title, entries, emptyText = "No data yet.") {
  if (!entries.length) {
    return `
      <div class="stat-box">
        <div class="stat-box-title">${title}</div>
        <div class="stat-box-sub">${emptyText}</div>
      </div>
    `;
  }

  return `
    <div class="stat-box">
      <div class="stat-box-title">${title}</div>
      <div class="stats-list">
        ${entries.map(([label, value]) => `
          <div class="stats-list-row">
            <span>${label}</span>
            <strong>${value}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function parseArtistNamesFromEvent(event) {
  const artists = [];

  if (event.t === "concert") {
    if (event.a) artists.push(event.a);
    if (event.o) {
      event.o
        .replace(/^With\s+/i, "")
        .split(/\s*&\s*|\s*,\s*|\s+and\s+/i)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(name => artists.push(name));
    }
  }

  if (event.t === "festival") {
    if (event.o) {
      event.o
        .split(/\s*,\s*/)
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(name => artists.push(name));
    }
  }

  return artists;
}

function getConcertLikeEvents() {
  return S.filter(e => e.t === "concert" || e.t === "festival");
}

function getLegacySportDetails(event) {
  if (event.t !== "sport") return null;

  const title = event.a || "";

  const leagueMatch = title.match(/^([A-Z]{2,6})\s*:\s*(.+?)\s+vs\.?\s+(.+?)(?:\s+—.*)?$/i);
  if (!leagueMatch) return null;

  const league = leagueMatch[1].toUpperCase().trim();
  const awayTeam = leagueMatch[2].trim();
  const homeTeam = leagueMatch[3].trim();

  let sportType = "other";

  if (["NHL", "AHL", "CHL", "IIHF", "WJC"].includes(league)) sportType = "hockey";
  else if (["NFL", "CFL", "NCAA"].includes(league)) sportType = "football";
  else if (["MLB"].includes(league)) sportType = "baseball";
  else if (["NBA", "CEBL"].includes(league)) sportType = "basketball";

  if (title.toUpperCase().includes("WORLD JUNIOR")) {
    sportType = "hockey";
  }

  return {
    sportType,
    league,
    awayTeam,
    homeTeam
  };
}

function getResolvedSportDetails(event) {
  if (event.t !== "sport") return null;

  const hasStructured =
    event.sportType || event.league || event.homeTeam || event.awayTeam;

  if (hasStructured) {
    return {
      sportType: (event.sportType || "other").toLowerCase(),
      league: event.league || "",
      awayTeam: event.awayTeam || "",
      homeTeam: event.homeTeam || ""
    };
  }

  const legacy = getLegacySportDetails(event);
  if (legacy) {
    return {
      sportType: (legacy.sportType || "other").toLowerCase(),
      league: legacy.league || "",
      awayTeam: legacy.awayTeam || "",
      homeTeam: legacy.homeTeam || ""
    };
  }

  return null;
}

function getSportEventsByType(type) {
  return S.filter(e => {
    if (e.t !== "sport") return false;
    const details = getResolvedSportDetails(e);
    return details && details.sportType === type.toLowerCase();
  });
}

function getOtherSportEvents() {
  return S.filter(e => {
    if (e.t !== "sport") return false;
    const details = getResolvedSportDetails(e);
    if (!details) return true;
    return !["hockey", "football", "baseball", "basketball"].includes(details.sportType);
  });
}

function setStatsTab(tab, el) {
  activeStatsTab = tab;

  document.querySelectorAll(".stats-tab").forEach(btn => btn.classList.remove("active"));
  if (el) el.classList.add("active");
  else {
    const match = document.querySelector(`.stats-tab[data-stats-tab="${tab}"]`);
    if (match) match.classList.add("active");
  }

  document.querySelectorAll(".stats-panel").forEach(panel => panel.classList.remove("active"));

  const map = {
    overall: "statsOverallPanel",
    concerts: "statsConcertsPanel",
    sports: "statsSportsPanel",
    wrestling: "statsWrestlingPanel"
  };

  const panelId = map[tab];
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add("active");
  }
}

function setSportStatsTab(tab, el) {
  activeSportStatsTab = tab;

  document.querySelectorAll(".stats-subtab").forEach(btn => btn.classList.remove("active"));
  if (el) el.classList.add("active");
  else {
    const match = document.querySelector(`.stats-subtab[data-sport-tab="${tab}"]`);
    if (match) match.classList.add("active");
  }

  document.querySelectorAll(".stats-sport-panel").forEach(panel => panel.classList.remove("active"));

  const map = {
    hockey: "statsSportsHockey",
    football: "statsSportsFootball",
    baseball: "statsSportsBaseball",
    basketball: "statsSportsBasketball",
    other: "statsSportsOther"
  };

  const panelId = map[tab];
  if (panelId) {
    const panel = document.getElementById(panelId);
    if (panel) panel.classList.add("active");
  }
}

function renderOverallStats() {
  const target = document.getElementById("statsOverallContent");
  if (!target) return;

  const venueCounts = countItems(S.map(e => extractVenueLocation(e.v).name));
  const regionCounts = countItems(S.map(e => extractRegionFromLocation(extractVenueLocation(e.v).location)).filter(Boolean));
  const countryCounts = countItems(S.map(e => extractCountryFromLocation(extractVenueLocation(e.v).location)).filter(c => c !== "Unknown"));

  target.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-title">Total Events</div>
      <div class="stat-box-value">${S.length}</div>
      <div class="stat-box-sub">All events in GigBook.</div>
    </div>

    ${renderListCard("Top 5 Venues", topNEntries(venueCounts, 5))}
    ${renderListCard("Events per Province / State", Object.entries(regionCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))}
    ${renderListCard("Events per Country", Object.entries(countryCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))}
  `;
}

function renderConcertStats() {
  const target = document.getElementById("statsConcertsContent");
  if (!target) return;

  const events = getConcertLikeEvents();
  const venueCounts = countItems(events.map(e => extractVenueLocation(e.v).name));

  const artistCounts = {};
  events.forEach(event => {
    parseArtistNamesFromEvent(event).forEach(name => {
      artistCounts[name] = (artistCounts[name] || 0) + 1;
    });
  });

  const outOfProvinceCount = events.filter(e => {
    const region = extractRegionFromLocation(extractVenueLocation(e.v).location).toUpperCase();
    return region && region !== "MB";
  }).length;

  const internationalCount = events.filter(e => {
    return extractCountryFromLocation(extractVenueLocation(e.v).location) !== "Canada";
  }).length;

  target.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-title">Total Concerts / Festivals</div>
      <div class="stat-box-value">${events.length}</div>
      <div class="stat-box-sub">Concerts and festivals combined.</div>
    </div>

    ${renderListCard("Top 5 Seen Artists", topNEntries(artistCounts, 5), "No artist data yet.")}
    ${renderListCard("Top 5 Seen Venues", topNEntries(venueCounts, 5), "No venue data yet.")}

    <div class="stat-box">
      <div class="stat-box-title">Out of Province Concerts</div>
      <div class="stat-box-value">${outOfProvinceCount}</div>
      <div class="stat-box-sub">Outside Manitoba.</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">International Concerts</div>
      <div class="stat-box-value">${internationalCount}</div>
      <div class="stat-box-sub">Outside Canada.</div>
    </div>
  `;
}

function renderSportTypeStats(type, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const events = type === "other" ? getOtherSportEvents() : getSportEventsByType(type);

  const leagueCounts = {};
  const teamCounts = {};
  const venueCounts = {};

  events.forEach(e => {
    const details = getResolvedSportDetails(e);
    const venueName = extractVenueLocation(e.v).name;

    if (details?.league) leagueCounts[details.league] = (leagueCounts[details.league] || 0) + 1;
    if (details?.homeTeam) teamCounts[details.homeTeam] = (teamCounts[details.homeTeam] || 0) + 1;
    if (details?.awayTeam) teamCounts[details.awayTeam] = (teamCounts[details.awayTeam] || 0) + 1;
    if (venueName) venueCounts[venueName] = (venueCounts[venueName] || 0) + 1;
  });

  target.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-title">Total ${titleCase(type)} Events</div>
      <div class="stat-box-value">${events.length}</div>
      <div class="stat-box-sub">${type === "other" ? "Sports without a main tracked type." : `${titleCase(type)} events tracked.`}</div>
    </div>

    ${renderListCard("Total Games per League", Object.entries(leagueCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), "No league data yet.")}
    ${renderListCard("Top 5 Seen Teams", topNEntries(teamCounts, 5), "No team data yet.")}
    ${renderListCard("Most Visited Venues", topNEntries(venueCounts, 5), "No venue data yet.")}
  `;
}

function renderWrestlingStats() {
  const target = document.getElementById("statsWrestlingContent");
  if (!target) return;

  const events = S.filter(e => e.t === "wrestling");
  const promotionCounts = countItems(events.map(e => e.promotion || (e.a.includes(":") ? e.a.split(":")[0].trim() : "")).filter(Boolean));
  const venueCounts = countItems(events.map(e => extractVenueLocation(e.v).name));

  target.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-title">Total Wrestling Events</div>
      <div class="stat-box-value">${events.length}</div>
      <div class="stat-box-sub">All wrestling events tracked.</div>
    </div>

    ${renderListCard("Total by Promotion", Object.entries(promotionCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), "No promotion data yet.")}
    ${renderListCard("Most Seen Wrestling Venues", topNEntries(venueCounts, 5), "No venue data yet.")}
  `;
}

function renderStats() {
  renderOverallStats();
  renderConcertStats();
  renderSportTypeStats("hockey", "statsSportsHockeyContent");
  renderSportTypeStats("football", "statsSportsFootballContent");
  renderSportTypeStats("baseball", "statsSportsBaseballContent");
  renderSportTypeStats("basketball", "statsSportsBasketballContent");
  renderSportTypeStats("other", "statsSportsOtherContent");
  renderWrestlingStats();

  setStatsTab(activeStatsTab);
  setSportStatsTab(activeSportStatsTab);
}

function updateAddEventForm() {
  const category = document.getElementById("aeCategory").value;
  const concertFields = document.getElementById("concertFields");
  const sportFields = document.getElementById("sportFields");
  const wrestlingFields = document.getElementById("wrestlingFields");

  if (concertFields) concertFields.style.display = category === "concert" || category === "festival" ? "block" : "none";
  if (sportFields) sportFields.style.display = category === "sport" ? "block" : "none";
  if (wrestlingFields) wrestlingFields.style.display = category === "wrestling" ? "block" : "none";
}

function openAddEventModal() {
  clearAddEventForm();
  updateAddEventForm();
  document.getElementById("addEventOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeAddEventModal() {
  document.getElementById("addEventOverlay").classList.remove("open");
  document.body.style.overflow = "";
  clearAddEventForm();
}

function clearAddEventForm() {
  document.getElementById("aeCategory").value = "concert";
  document.getElementById("aeTitle").value = "";
  document.getElementById("aeSupport").value = "";
  document.getElementById("aeSportType").value = "";
  document.getElementById("aeLeague").value = "";
  document.getElementById("aeAwayTeam").value = "";
  document.getElementById("aeHomeTeam").value = "";
  document.getElementById("aeSportNote").value = "";
  document.getElementById("aePromotion").value = "";
  document.getElementById("aeWrestlingEvent").value = "";
  document.getElementById("aeDate").value = "";
  document.getElementById("aeVenue").value = "";
  document.getElementById("aeLocation").value = "";
  document.getElementById("aeTag").value = "";
  updateAddEventForm();
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
    festival: { emoji: "🎡", gradient: "#1a1000,#051a10", tagClass: "tp", tagText: "Festival" },
    sport: { emoji: "🏒", gradient: "#001a10,#1a0020", tagClass: "tb", tagText: "Sport" },
    wrestling: { emoji: "🤼", gradient: "#1a0800,#0a0a0a", tagClass: "to", tagText: "Wrestling" },
    comedy: { emoji: "😂", gradient: "#1a1505,#051a15", tagClass: "ty", tagText: "Comedy" },
    theatre: { emoji: "🎭", gradient: "#05051a,#1a051a", tagClass: "to", tagText: "Theatre" },
    kids: { emoji: "🧸", gradient: "#1a0520,#051a15", tagClass: "tk", tagText: "Kids Show" },
    curling: { emoji: "🥌", gradient: "#051a15,#1a0510", tagClass: "tg", tagText: "Curling" },
    cancelled: { emoji: "❌", gradient: "#200505,#050520", tagClass: "tr", tagText: "Cancelled" }
  };
  return map[category] || map.concert;
}

function buildEventTitle(category) {
  if (category === "concert" || category === "festival") {
    return document.getElementById("aeTitle").value.trim();
  }

  if (category === "sport") {
    const league = document.getElementById("aeLeague").value.trim();
    const awayTeam = document.getElementById("aeAwayTeam").value.trim();
    const homeTeam = document.getElementById("aeHomeTeam").value.trim();

    if (league && awayTeam && homeTeam) {
      return `${league}: ${awayTeam} vs ${homeTeam}`;
    }
    return "";
  }

  if (category === "wrestling") {
    const promotion = document.getElementById("aePromotion").value.trim();
    const eventName = document.getElementById("aeWrestlingEvent").value.trim();

    if (promotion && eventName) return `${promotion}: ${eventName}`;
    return eventName || promotion || "";
  }

  return document.getElementById("aeTitle").value.trim();
}

function buildSupportText(category) {
  if (category === "concert" || category === "festival") {
    return document.getElementById("aeSupport").value.trim();
  }
  return "";
}

function buildExtraTags(category) {
  const tags = [];
  const customTag = document.getElementById("aeTag").value.trim();

  if (category === "sport") {
    const sportType = document.getElementById("aeSportType").value.trim();
    const league = document.getElementById("aeLeague").value.trim();
    const sportNote = document.getElementById("aeSportNote").value.trim();

    if (sportType) tags.push(["ta", titleCase(sportType)]);
    if (league) tags.push(["ta", league]);
    if (sportNote) tags.push(["ta", sportNote]);
  }

  if (category === "wrestling") {
    const promotion = document.getElementById("aePromotion").value.trim();
    if (promotion) tags.push(["ta", promotion]);
  }

  if (customTag) {
    tags.push(["ta", customTag]);
  }

  return tags;
}

function saveNewEvent() {
  const category = document.getElementById("aeCategory").value;
  const title = buildEventTitle(category);
  const support = buildSupportText(category);
  const dateValue = document.getElementById("aeDate").value;
  const venue = document.getElementById("aeVenue").value.trim();
  const location = document.getElementById("aeLocation").value.trim();

  if (!title || !dateValue || !venue || !location) {
    toast("Please fill in the required fields.");
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
    tags: [[style.tagClass, style.tagText], ...buildExtraTags(category)],
    y: year
  };

  if (category === "sport") {
    newEvent.sportType = document.getElementById("aeSportType").value.trim();
    newEvent.league = document.getElementById("aeLeague").value.trim();
    newEvent.awayTeam = document.getElementById("aeAwayTeam").value.trim();
    newEvent.homeTeam = document.getElementById("aeHomeTeam").value.trim();
    newEvent.sportNote = document.getElementById("aeSportNote").value.trim();
  }

  if (category === "wrestling") {
    newEvent.promotion = document.getElementById("aePromotion").value.trim();
    newEvent.eventName = document.getElementById("aeWrestlingEvent").value.trim();
  }

  const stored = getStoredCustomEvents();
  stored.push(newEvent);
  saveStoredCustomEvents(stored);

  S.push(newEvent);

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

mergeStoredEventsIntoS();
updateAddEventForm();
render();
renderStats();
renderMap();