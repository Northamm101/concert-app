const IC = {};
let cF = "all";
let cQ = "";
let activeScreen = "shows";
let activeStatsTab = "overall";
let activeSportStatsTab = "hockey";
let editingEventId = null;

const STORAGE_KEY = "gigbook_custom_events_v1";
const HIDDEN_EVENTS_KEY = "gigbook_hidden_events_v1";
const OVERRIDES_KEY = "gigbook_event_overrides_v1";

const SPORT_LEAGUE_OPTIONS = {
  baseball: ["MLB", "American Association", "Northern League", "Other"],
  basketball: ["CEBL", "NBA", "NCAA", "Other"],
  football: ["CFL", "NFL", "NCAA", "Other"],
  hockey: ["NHL", "AHL", "QMJHL", "OHL", "WHL", "IIHF (International)", "Other"],
  soccer: ["CPL", "MLS", "Other"]
};

const CURLING_EVENT_OPTIONS = [
  "Brier",
  "Scotties",
  "GSOC: Invitational",
  "GSOC: Masters",
  "GSOC: National",
  "GSOC: Open",
  "GSOC: Players Cup",
  "Rock League",
  "World Championship",
  "Provincial Championship",
  "Continental Cup",
  "Olympic Trials",
  "Olympic Pre-Trials"
];

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

  if (normalized === "CANADA LIFE CENTRE") displayName = "Canada Life Centre";
  if (normalized === "SASKTEL CENTRE") displayName = "SaskTel Centre";
  if (normalized === "MALL OF AMERICA FIELD") displayName = "Mall of America Field";
  if (normalized === "PRINCESS AUTO STADIUM") displayName = "Princess Auto Stadium";
  if (normalized === "RBC CONVENTION CENTRE") displayName = "RBC Convention Centre";
  if (normalized === "ALERUS CENTER") displayName = "Alerus Center";

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

function getEventDrawNumber(s) {
  const draw = parseInt(s.drawNumber || "", 10);
  return Number.isFinite(draw) ? draw : 9999;
}

function compareEventsDescending(a, b) {
  const dateDiff = eventSortableDate(b) - eventSortableDate(a);
  if (dateDiff !== 0) return dateDiff;

  const aIsCurling = a.t === "sport" && (a.sportType || "").toLowerCase() === "curling";
  const bIsCurling = b.t === "sport" && (b.sportType || "").toLowerCase() === "curling";

  if (aIsCurling && bIsCurling) {
    const drawDiff = getEventDrawNumber(a) - getEventDrawNumber(b);
    if (drawDiff !== 0) return drawDiff;
  }

  return (a.a || "").localeCompare(b.a || "");
}

function compareEventsAscending(a, b) {
  const dateDiff = eventSortableDate(a) - eventSortableDate(b);
  if (dateDiff !== 0) return dateDiff;

  const aIsCurling = a.t === "sport" && (a.sportType || "").toLowerCase() === "curling";
  const bIsCurling = b.t === "sport" && (b.sportType || "").toLowerCase() === "curling";

  if (aIsCurling && bIsCurling) {
    const drawDiff = getEventDrawNumber(a) - getEventDrawNumber(b);
    if (drawDiff !== 0) return drawDiff;
  }

  return (a.a || "").localeCompare(b.a || "");
}

function isFutureEvent(s) {
  if (s.t === "cancelled") return false;
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

function createStableEventId(event) {
  const raw = [
    event.a || "",
    event.d || "",
    event.v || "",
    event.t || "",
    event.o || "",
    event.isoDate || "",
    event.y || ""
  ].join("||");

  return "ev_" + raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function ensureEventHasId(event) {
  if (!event.id) {
    event.id = createStableEventId(event);
  }
  return event;
}

function getHiddenEventIds() {
  return [];
}

function saveHiddenEventIds(ids) {
  return;
}

function isEventHidden(event) {
  return false;
}

function getEventOverrides() {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Could not read GigBook overrides:", error);
    return {};
  }
}

function saveEventOverrides(overrides) {
  try {
    localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.error("Could not save GigBook overrides:", error);
    toast("Could not update event on this device.");
  }
}

function getOverrideForEventId(eventId) {
  const overrides = getEventOverrides();
  return overrides[eventId] || null;
}

function setOverrideForEventId(eventId, data) {
  const overrides = getEventOverrides();
  overrides[eventId] = data;
  saveEventOverrides(overrides);
}

function removeOverrideForEventId(eventId) {
  const overrides = getEventOverrides();
  if (overrides[eventId]) {
    delete overrides[eventId];
    saveEventOverrides(overrides);
  }
}

function applyOverridesToEvent(event) {
  ensureEventHasId(event);
  const override = getOverrideForEventId(event.id);
  if (!override) return event;

  const updated = { ...event };

  if (override.action === "cancelled") {
    updated.t = "cancelled";
    updated.e = "❌";
    updated.g = "#200505,#050520";

    const filteredTags = (updated.tags || []).filter(tag => tag[1] !== "Cancelled");
    updated.tags = [["tr", "Cancelled"], ...filteredTags];
  }

  return updated;
}

function permanentlyDeleteEvent(eventId) {
  const stored = getStoredCustomEvents().filter(e => {
    ensureEventHasId(e);
    return e.id !== eventId;
  });

  saveStoredCustomEvents(stored);
  removeOverrideForEventId(eventId);

  const index = S.findIndex(e => {
    ensureEventHasId(e);
    return e.id === eventId;
  });

  if (index !== -1) {
    S.splice(index, 1);
  }

  closeModal();
  render();

  if (activeScreen === "map") renderMap();
  if (activeScreen === "stats") renderStats();

  toast("Event Deleted");
}

function markEventCancelled(eventId) {
  const event = S.find(e => {
    ensureEventHasId(e);
    return e.id === eventId;
  });

  if (!event) {
    toast("Could not find event.");
    return;
  }

  if (event.t === "cancelled") {
    toast("Event already cancelled");
    return;
  }

  if (getStoredCustomEvents().some(e => {
    ensureEventHasId(e);
    return e.id === eventId;
  })) {
    const stored = getStoredCustomEvents();
    const idx = stored.findIndex(e => {
      ensureEventHasId(e);
      return e.id === eventId;
    });

    if (idx !== -1) {
      stored[idx].t = "cancelled";
      stored[idx].e = "❌";
      stored[idx].g = "#200505,#050520";
      stored[idx].tags = [["tr", "Cancelled"], ...(stored[idx].tags || []).filter(tag => tag[1] !== "Cancelled")];
      saveStoredCustomEvents(stored);
    }

    event.t = "cancelled";
    event.e = "❌";
    event.g = "#200505,#050520";
    event.tags = [["tr", "Cancelled"], ...(event.tags || []).filter(tag => tag[1] !== "Cancelled")];
  } else {
    setOverrideForEventId(eventId, { action: "cancelled" });
  }

  closeModal();
  render();

  if (activeScreen === "map") renderMap();
  if (activeScreen === "stats") renderStats();

  toast("Event Cancelled");
}

function hideEventById(eventId) {
  permanentlyDeleteEvent(eventId);
}

function restoreHiddenEventById(eventId) {
  return;
}

function clearAllHiddenEvents() {
  return;
}

function startEditEvent(eventId) {
  const event = S.find(e => {
    ensureEventHasId(e);
    return e.id === eventId;
  });

  if (!event) {
    toast("Could not find event to edit.");
    return;
  }

  editingEventId = event.id;

  closeModal();
  openAddEventModal();
  fillAddEventForm(event);
}

function buildDisplayNumberMap() {
  const visibleEvents = getVisibleEvents().sort(compareEventsDescending);
  const map = new Map();

  visibleEvents.forEach((event, index) => {
    map.set(eventKey(event), visibleEvents.length - index);
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
    ensureEventHasId(ev);
    const key = eventKey(ev);
    if (!existingKeys.has(key)) {
      S.push(ev);
      existingKeys.add(key);
    }
  });
}

function eventHasMagicTag(s) {
  return Array.isArray(s.tags) && s.tags.some(tag => String(tag[1] || "").toLowerCase() === "magic");
}

function getSceneLynxImageForEvent(s) {
  if (eventHasMagicTag(s)) return "Lynx-Magic.jpg";

  if (s.t === "concert") return "Lynx-Concert.jpg";
  if (s.t === "comedy") return "Lynx-Comedy.jpg";
  if (s.t === "festival") return "Lynx-Festival.jpg";
  if (s.t === "theatre") return "Lynx-Theatre.jpg";
  if (s.t === "kids") return "Lynx-Kids.jpg";
  if (s.t === "wrestling") return "Lynx-Wrestling.jpg";
  if (s.t === "cancelled") return "Lynx-Other.jpg";

  if (s.t === "sport") {
    const details = getResolvedSportDetails(s);
    const sportType = ((s.sportType || details?.sportType || "") + "").toLowerCase();

    if (sportType === "hockey") return "Lynx-Hockey.jpg";
    if (sportType === "football") return "Lynx-Football.jpg";
    if (sportType === "baseball") return "Lynx-Baseball.jpg";
    if (sportType === "basketball") return "Lynx-Basketball.jpg";
    if (sportType === "soccer") return "Lynx-Soccer.jpg";
    if (sportType === "curling") return "Lynx-Curling.jpg";
    return "Lynx-Other.jpg";
  }

  return "Lynx-Other.jpg";
}

    if (sportType === "basketball") return "Lynx-Basketball.jpg";
    if (sportType === "soccer") return "Lynx-Soccer.jpg";
    if (sportType === "curling") return "Lynx-Curling.jpg";
    return "Lynx-Other.jpg";
  }

  return "Lynx-Other.jpg";
}

async function getImg(s) {
  const k = s.id || eventKey(s);
  if (IC[k] !== undefined) return IC[k];

  const u = getSceneLynxImageForEvent(s);
  IC[k] = u;
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
  if (u) applyImg(u, cid, modal);
  else if (cid) {
    const el = document.getElementById(cid);
    if (el) el.classList.remove("shim");
  }
}

function getVisibleEvents() {
  return S
    .map(s => ensureEventHasId(s))
    .map(s => applyOverridesToEvent(s))
    .filter(s => !isEventHidden(s))
    .filter(s => {
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

function applyStoredEventOverrides() {
  S = S.map(event => {
    ensureEventHasId(event);
    return applyOverridesToEvent(event);
  });
}

function updateStats(a) {
  document.getElementById("sT").textContent = a.length;
  document.getElementById("sC").textContent = a.filter(s => s.t === "cancelled").length;
  document.getElementById("sV").textContent = new Set(a.map(s => normalizeVenueName(s.v))).size;
  document.getElementById("sY").textContent = new Set(a.map(s => s.y)).size;
}

function updateHeaderLogo() {
  const headerLogo = document.getElementById("headerLogoImg");
  if (headerLogo) {
    headerLogo.src = "SceneLynx-LogoSmall.jpg";
  }
}

function getDaysUntilEvent(event) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = eventSortableDate(event);
  const diffMs = target - today;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function formatCountdownLabel(event) {
  const days = getDaysUntilEvent(event);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day away";
  return `${days} days away`;
}

function getUpcomingBadge(event) {
  if (event.t === "concert") return "Concert";
  if (event.t === "festival") return "Festival";
  if (event.t === "wrestling") return "Wrestling";
  if (event.t === "sport") return getDisplaySportType(event) || "Sport";
  if (event.t === "comedy") return "Comedy";
  if (event.t === "theatre") return "Theatre";
  if (event.t === "kids") return "Kids";
  if (event.t === "cancelled") return "Cancelled";
  return "Upcoming";
}

function renderUpcoming(events) {
  const upcomingList = document.getElementById("upcomingList");
  if (!upcomingList) return;

  upcomingList.innerHTML = "";

  if (!events.length) {
    upcomingList.innerHTML = `<div class="coming-card" style="margin:0 20px 0 20px;">No upcoming events yet.</div>`;
    return;
  }

  const visibleEvents = getVisibleEvents().sort(compareEventsDescending);
  const numberMap = new Map();
  visibleEvents.forEach((event, index) => {
    numberMap.set(eventKey(event), visibleEvents.length - index);
  });

  events
    .sort(compareEventsAscending)
    .forEach(s => {
      const entryNumber = numberMap.get(eventKey(s)) || "—";
      const card = document.createElement("div");
      card.className = "upcoming-card";
      card.innerHTML = `
        <div class="up-topline">
          <span class="up-badge">${getUpcomingBadge(s)}</span>
          <span class="up-countdown">${formatCountdownLabel(s)}</span>
        </div>
        <div class="up-date">${s.d}</div>
        <div class="up-artist">${s.a}</div>
        <div class="up-openers">${s.o || ""}</div>
        <div class="up-venue">${extractVenueLocation(s.v).name}</div>
        <div class="up-location">${extractVenueLocation(s.v).location || ""}</div>
        <div class="up-footer">
          <div class="up-actions">
            <button class="up-btn primary" onclick="switchScreen('map')">Map</button>
          </div>
          <div class="up-entry">#${entryNumber}</div>
        </div>
      `;
      card.onclick = (e) => {
        if (e.target.closest("button")) return;
        openModal(s, entryNumber);
      };
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
    .sort(compareEventsDescending);

  renderUpcoming(upcomingEvents);
  renderHiddenEventsManager();

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

function getDisplayPromotion(event) {
  if (event.promotion === "Other") return event.customPromotion || "Other";
  if (event.promotion === "WWE/WWF") return "WWE / WWF";
  return event.promotion || "";
}

function getDisplaySportType(event) {
  if ((event.sportType || "").toLowerCase() === "other") return event.customSportType || "Other";
  return titleCase(event.sportType || "");
}

function getDisplayLeague(event) {
  if ((event.sportType || "").toLowerCase() === "other") return event.customLeague || "";
  if ((event.league || "").toLowerCase() === "other") return event.customLeague || "Other";
  return event.league || "";
}

function openModal(s, num) {
  ensureEventHasId(s);
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
    cancelled: "Cancelled"
  };

  const sportTypeRow = s.t === "sport" && s.sportType
    ? `<div class="irow"><span class="ikey">Sport Type</span><span class="ival">${getDisplaySportType(s)}</span></div>`
    : "";

  const sportLeagueRow = s.t === "sport" && getDisplayLeague(s)
    ? `<div class="irow"><span class="ikey">League / Event</span><span class="ival">${getDisplayLeague(s)}</span></div>`
    : "";

  const sportTeamsRow = s.t === "sport" && s.awayTeam && s.homeTeam
    ? `<div class="irow"><span class="ikey">Matchup</span><span class="ival">${s.awayTeam} vs ${s.homeTeam}</span></div>`
    : "";

  const sportCurlingDrawRow = s.t === "sport" && (s.sportType || "").toLowerCase() === "curling" && s.drawNumber
    ? `<div class="irow"><span class="ikey">Draw Number</span><span class="ival">${s.drawNumber}</span></div>`
    : "";

  const sportNoteRow = s.t === "sport" && s.sportNote
    ? `<div class="irow"><span class="ikey">Event Note</span><span class="ival">${s.sportNote}</span></div>`
    : "";

  const wrestlingPromotionRow = s.t === "wrestling" && getDisplayPromotion(s)
    ? `<div class="irow"><span class="ikey">Promotion</span><span class="ival">${getDisplayPromotion(s)}</span></div>`
    : "";

  const isUpcoming = isFutureEvent(s);
  const cancelButton = isUpcoming && s.t !== "cancelled"
    ? `
        <button
          onclick="markEventCancelled('${s.id}')"
          style="flex:1;background:rgba(216,90,90,.10);border:1px solid rgba(216,90,90,.25);color:#ff8f8f;border-radius:10px;padding:12px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;"
        >
          Mark as Cancelled
        </button>
      `
    : "";

  document.getElementById("mBody").innerHTML = `
    <div class="msec">
      <div class="msec-title">Event Details</div>
      <div class="irow"><span class="ikey">Date</span><span class="ival">${s.d}</span></div>
      <div class="irow"><span class="ikey">Venue</span><span class="ival">${extractVenueLocation(s.v).name}${extractVenueLocation(s.v).location ? " · " + extractVenueLocation(s.v).location : ""}</span></div>
      ${s.o ? `<div class="irow"><span class="ikey">Support</span><span class="ival">${s.o}</span></div>` : ""}
      <div class="irow"><span class="ikey">Category</span><span class="ival">${tl[s.t] || s.t}</span></div>
      ${sportTypeRow}
      ${sportLeagueRow}
      ${sportTeamsRow}
      ${sportCurlingDrawRow}
      ${sportNoteRow}
      ${wrestlingPromotionRow}
      <div class="irow"><span class="ikey">Entry</span><span class="ival" style="color:var(--cyan)">#${num} in GigBook</span></div>
    </div>

    <div class="msec">
      <div class="msec-title">Actions</div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <button
          onclick="startEditEvent('${s.id}')"
          style="flex:1;background:rgba(0,229,200,.10);border:1px solid rgba(0,229,200,.25);color:var(--cyan);border-radius:10px;padding:12px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;"
        >
          Edit Event
        </button>
        ${cancelButton}
        <button
          onclick="permanentlyDeleteEvent('${s.id}')"
          style="flex:1;background:rgba(255,77,106,.10);border:1px solid rgba(255,77,106,.25);color:var(--red);border-radius:10px;padding:12px;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:600;cursor:pointer;"
        >
          Delete Event
        </button>
      </div>
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
    setTimeout(() => {
      gigbookLeafletMap.invalidateSize();
      gigbookLeafletMap.setView([49.8951, -97.1384], 3);
    }, 80);
    return;
  }

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

    if (index === 0) {
      renderVenueDetails(group);
    }
  });

  const northAmericaBounds = L.latLngBounds(
    L.latLng(15, -170),
    L.latLng(75, -50)
  );

  gigbookLeafletMap.fitBounds(northAmericaBounds, { padding: [20, 20] });

  setTimeout(() => {
    gigbookLeafletMap.invalidateSize();
    gigbookLeafletMap.fitBounds(northAmericaBounds, { padding: [20, 20] });
  }, 80);
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
      const sortedEvents = [...events].sort(compareEventsDescending);

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
    if (event.festivalHeadliner) artists.push(event.festivalHeadliner);
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
  const leagueMatch = title.match(/^([A-Z]{2,20})\s*:\s*(.+?)\s+vs\.?\s+(.+?)(?:\s+—.*)?$/i);
  if (!leagueMatch) return null;

  const league = leagueMatch[1].trim();
  const awayTeam = leagueMatch[2].trim();
  const homeTeam = leagueMatch[3].trim();

  let sportType = "other";

  if (["NHL", "AHL", "CHL", "IIHF", "WJC", "QMJHL", "OHL", "WHL"].includes(league.toUpperCase())) sportType = "hockey";
  else if (["NFL", "CFL", "NCAA"].includes(league.toUpperCase())) sportType = "football";
  else if (["MLB", "AMERICAN ASSOCIATION", "NORTHERN LEAGUE"].includes(league.toUpperCase())) sportType = "baseball";
  else if (["NBA", "CEBL"].includes(league.toUpperCase())) sportType = "basketball";
  else if (["MLS", "CPL"].includes(league.toUpperCase())) sportType = "soccer";

  if (title.toUpperCase().includes("WORLD JUNIOR")) {
    sportType = "hockey";
  }

  return { sportType, league, awayTeam, homeTeam };
}

function getResolvedSportDetails(event) {
  if (event.t !== "sport") return null;

  const hasStructured =
    event.sportType || event.league || event.homeTeam || event.awayTeam || event.customSportType || event.customLeague;

  if (hasStructured) {
    return {
      sportType: (event.sportType || "other").toLowerCase(),
      league: getDisplayLeague(event),
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
    const details = getResolvedSportDetails(applyOverridesToEvent(e));
    return details && details.sportType === type.toLowerCase();
  });
}

function getOtherSportEvents() {
  return S.filter(e => {
    const ev = applyOverridesToEvent(e);
    if (ev.t !== "sport") return false;
    const details = getResolvedSportDetails(ev);
    if (!details) return true;
    return !["hockey", "football", "baseball", "basketball", "soccer", "curling"].includes(details.sportType);
  });
}

function getCurlingEvents() {
  return S.filter(e => {
    const ev = applyOverridesToEvent(e);
    return ev.t === "sport" && (ev.sportType || "").toLowerCase() === "curling";
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
    other: "statsSportsOther",
    soccer: "statsSportsSoccer",
    curling: "statsSportsCurling"
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

  const visible = getVisibleEvents();
  const venueCounts = countItems(visible.map(e => extractVenueLocation(e.v).name));
  const regionCounts = countItems(visible.map(e => extractRegionFromLocation(extractVenueLocation(e.v).location)).filter(Boolean));
  const countryCounts = countItems(visible.map(e => extractCountryFromLocation(extractVenueLocation(e.v).location)).filter(c => c !== "Unknown"));

  target.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-title">Total Events</div>
      <div class="stat-box-value">${visible.length}</div>
      <div class="stat-box-sub">All visible events in GigBook.</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Deleted Events</div>
      <div class="stat-box-value">0</div>
      <div class="stat-box-sub">Deleted events are removed permanently.</div>
    </div>

    ${renderListCard("Top 5 Venues", topNEntries(venueCounts, 5))}
    ${renderListCard("Events per Province / State", Object.entries(regionCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))}
    ${renderListCard("Events per Country", Object.entries(countryCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])))}
  `;
}

function renderConcertStats() {
  const target = document.getElementById("statsConcertsContent");
  if (!target) return;

  const events = getVisibleEvents().filter(e => e.t === "concert" || e.t === "festival");
  const concertOnly = events.filter(e => e.t === "concert");
  const festivalOnly = events.filter(e => e.t === "festival");
  const venueCounts = countItems(events.map(e => extractVenueLocation(e.v).name));
  const cityCounts = countItems(events.map(e => extractVenueLocation(e.v).location).filter(Boolean));

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
      <div class="stat-box-sub">${concertOnly.length} concerts and ${festivalOnly.length} festivals.</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Concerts Only</div>
      <div class="stat-box-value">${concertOnly.length}</div>
      <div class="stat-box-sub">Standard concert entries.</div>
    </div>

    <div class="stat-box">
      <div class="stat-box-title">Festivals Only</div>
      <div class="stat-box-value">${festivalOnly.length}</div>
      <div class="stat-box-sub">Festival entries in GigBook.</div>
    </div>

    ${renderListCard("Top 5 Seen Artists", topNEntries(artistCounts, 5), "No artist data yet.")}
    ${renderListCard("Top 5 Seen Venues", topNEntries(venueCounts, 5), "No venue data yet.")}
    ${renderListCard("Top 5 Concert Cities", topNEntries(cityCounts, 5), "No city data yet.")}

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

  let events = [];
  if (type === "other") {
    events = getVisibleEvents().filter(e => getOtherSportEvents().some(x => ensureEventHasId(x).id === e.id));
  } else if (type === "curling") {
    events = getVisibleEvents().filter(e => getCurlingEvents().some(x => ensureEventHasId(x).id === e.id));
  } else {
    events = getVisibleEvents().filter(e => getSportEventsByType(type).some(x => ensureEventHasId(x).id === e.id));
  }

  const leagueCounts = {};
  const teamCounts = {};
  const venueCounts = {};
  const eventTypeCounts = {};

  events.forEach(e => {
    const details = getResolvedSportDetails(e);
    const venueName = extractVenueLocation(e.v).name;

    if (type === "curling") {
      if (e.eventType) eventTypeCounts[e.eventType] = (eventTypeCounts[e.eventType] || 0) + 1;
    } else {
      if (details?.league) leagueCounts[details.league] = (leagueCounts[details.league] || 0) + 1;
      if (details?.homeTeam) teamCounts[details.homeTeam] = (teamCounts[details.homeTeam] || 0) + 1;
      if (details?.awayTeam) teamCounts[details.awayTeam] = (teamCounts[details.awayTeam] || 0) + 1;
    }

    if (venueName) venueCounts[venueName] = (venueCounts[venueName] || 0) + 1;
  });

  if (type === "curling") {
    target.innerHTML = `
      <div class="stat-box">
        <div class="stat-box-title">Total Curling Events</div>
        <div class="stat-box-value">${events.length}</div>
        <div class="stat-box-sub">Curling events tracked through Sport.</div>
      </div>

      ${renderListCard("Event Types", Object.entries(eventTypeCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])), "No curling event types yet.")}
      ${renderListCard("Most Visited Curling Venues", topNEntries(venueCounts, 5), "No venue data yet.")}
    `;
    return;
  }

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

  const events = getVisibleEvents().filter(e => e.t === "wrestling");
  const venueCounts = countItems(events.map(e => extractVenueLocation(e.v).name));
  const promotionCounts = {};

  events.forEach(e => {
    let promotion = getDisplayPromotion(e);

    if (!promotion && e.a && e.a.includes(":")) {
      promotion = e.a.split(":")[0].trim();
    }

    if (promotion) {
      promotionCounts[promotion] = (promotionCounts[promotion] || 0) + 1;
    }
  });

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
  renderSportTypeStats("soccer", "statsSportsSoccerContent");
  renderSportTypeStats("curling", "statsSportsCurlingContent");
  renderSportTypeStats("other", "statsSportsOtherContent");
  renderWrestlingStats();

  setStatsTab(activeStatsTab);
  setSportStatsTab(activeSportStatsTab);
}

function renderHiddenEventsManager() {
  const wrap = document.getElementById("hiddenEventsManager");
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="stat-box hidden-manager-card">
      <div class="hidden-manager-head">
        <div>
          <div class="hidden-manager-title">Deleted Events</div>
          <div class="hidden-manager-sub">Events are now permanently deleted instead of hidden.</div>
        </div>
      </div>
      <div class="hidden-empty">No hidden event area is used right now.</div>
    </div>
  `;
}

function populateLeagueOptions(sportType, selectedValue = "") {
  const leagueSelect = document.getElementById("aeLeague");
  if (!leagueSelect) return;

  const options = SPORT_LEAGUE_OPTIONS[(sportType || "").toLowerCase()] || [];
  leagueSelect.innerHTML = `<option value="">Select league</option>`;

  options.forEach(option => {
    const opt = document.createElement("option");
    opt.value = option;
    opt.textContent = option;
    if (option === selectedValue) opt.selected = true;
    leagueSelect.appendChild(opt);
  });
}

function getSelectedPromotionLabel() {
  const promotion = document.getElementById("aePromotion").value.trim();
  const customPromotion = document.getElementById("aeCustomPromotion").value.trim();

  if (promotion === "Other") return customPromotion || "Other";
  if (promotion === "WWE/WWF") return "WWE / WWF";
  return promotion;
}

function getSelectedSportTypeLabel() {
  const sportType = document.getElementById("aeSportType").value.trim().toLowerCase();
  const customSportType = document.getElementById("aeCustomSportType").value.trim();

  if (sportType === "other") return customSportType || "Other";
  return titleCase(sportType);
}

function getSelectedLeagueLabel() {
  const sportType = document.getElementById("aeSportType").value.trim().toLowerCase();
  const league = document.getElementById("aeLeague").value.trim();
  const customLeague = document.getElementById("aeCustomLeague").value.trim();

  if (sportType === "other") return customLeague || "";
  if (league === "Other") return customLeague || "Other";
  return league;
}

function setAddEventHeading() {
  const heading = document.getElementById("addEventHeading");
  const subtitle = document.getElementById("addEventSubtitle");
  if (!heading || !subtitle) return;

  if (editingEventId) {
    heading.textContent = "Edit Event";
    subtitle.textContent = "Update an existing event in GigBook.";
  } else {
    heading.textContent = "Add Event";
    subtitle.textContent = "Create a new event card in GigBook.";
  }
}

function updateSportFields() {
  const sportType = document.getElementById("aeSportType").value.trim().toLowerCase();
  const teamSportFields = document.getElementById("teamSportFields");
  const curlingFields = document.getElementById("curlingFields");
  const sportTypeOtherWrap = document.getElementById("sportTypeOtherWrap");
  const sportLeagueWrap = document.getElementById("sportLeagueWrap");
  const sportLeagueOtherWrap = document.getElementById("sportLeagueOtherWrap");

  if (sportTypeOtherWrap) sportTypeOtherWrap.style.display = sportType === "other" ? "block" : "none";
  if (sportLeagueWrap) sportLeagueWrap.style.display = sportType && sportType !== "curling" ? "block" : "none";
  if (teamSportFields) teamSportFields.style.display = sportType && sportType !== "curling" ? "block" : "none";
  if (curlingFields) curlingFields.style.display = sportType === "curling" ? "block" : "none";

  if (sportType && sportType !== "curling" && sportType !== "other") {
    populateLeagueOptions(sportType, document.getElementById("aeLeague").value);
  } else if (sportType === "other") {
    document.getElementById("aeLeague").innerHTML = `<option value="">Custom league below</option>`;
  } else {
    document.getElementById("aeLeague").innerHTML = `<option value="">Select league</option>`;
  }

  const selectedLeague = document.getElementById("aeLeague").value;
  if (sportLeagueOtherWrap) {
    sportLeagueOtherWrap.style.display = (sportType === "other" || selectedLeague === "Other") ? "block" : "none";
  }
}

function updateAddEventForm() {
  const category = document.getElementById("aeCategory").value;
  const simpleFields = document.getElementById("simpleFields");
  const festivalFields = document.getElementById("festivalFields");
  const theatreFields = document.getElementById("theatreFields");
  const wrestlingFields = document.getElementById("wrestlingFields");
  const sportFields = document.getElementById("sportFields");
  const simpleHeadlinerLabel = document.getElementById("simpleHeadlinerLabel");
  const wrestlingOtherPromotionWrap = document.getElementById("wrestlingOtherPromotionWrap");

  if (simpleFields) simpleFields.style.display = ["concert", "comedy", "kids", "cancelled"].includes(category) ? "flex" : "none";
  if (festivalFields) festivalFields.style.display = category === "festival" ? "flex" : "none";
  if (theatreFields) theatreFields.style.display = category === "theatre" ? "flex" : "none";
  if (wrestlingFields) wrestlingFields.style.display = category === "wrestling" ? "flex" : "none";
  if (sportFields) sportFields.style.display = category === "sport" ? "flex" : "none";

  if (simpleHeadlinerLabel) {
    if (category === "comedy") simpleHeadlinerLabel.textContent = "Headliner";
    else if (category === "kids") simpleHeadlinerLabel.textContent = "Headliner";
    else if (category === "cancelled") simpleHeadlinerLabel.textContent = "Event Name";
    else simpleHeadlinerLabel.textContent = "Headliner";
  }

  if (wrestlingOtherPromotionWrap) {
    wrestlingOtherPromotionWrap.style.display = category === "wrestling" && document.getElementById("aePromotion").value === "Other"
      ? "block"
      : "none";
  }

  if (category === "sport") {
    updateSportFields();
  } else {
    document.getElementById("sportTypeOtherWrap").style.display = "none";
    document.getElementById("sportLeagueOtherWrap").style.display = "none";
    document.getElementById("teamSportFields").style.display = "block";
    document.getElementById("curlingFields").style.display = "none";
  }
}

function openAddEventModal() {
  if (!editingEventId) {
    clearAddEventForm();
  }
  setAddEventHeading();
  updateAddEventForm();
  document.getElementById("addEventOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeAddEventModal() {
  document.getElementById("addEventOverlay").classList.remove("open");
  document.body.style.overflow = "";
  clearAddEventForm();
  editingEventId = null;
  setAddEventHeading();
}

function clearAddEventForm() {
  document.getElementById("aeCategory").value = "concert";
  document.getElementById("aeSimpleHeadliner").value = "";
  document.getElementById("aeSimpleSupport").value = "";
  document.getElementById("aeFestivalName").value = "";
  document.getElementById("aeFestivalHeadliner").value = "";
  document.getElementById("aeFestivalSupport").value = "";
  document.getElementById("aeTheatreTitle").value = "";
  document.getElementById("aeTheatreSupport").value = "";
  document.getElementById("aePromotion").value = "";
  document.getElementById("aeCustomPromotion").value = "";
  document.getElementById("aeWrestlingEvent").value = "";
  document.getElementById("aeSportType").value = "";
  document.getElementById("aeCustomSportType").value = "";
  populateLeagueOptions("");
  document.getElementById("aeCustomLeague").value = "";
  document.getElementById("aeAwayTeam").value = "";
  document.getElementById("aeHomeTeam").value = "";
  document.getElementById("aeSportNote").value = "";
  document.getElementById("aeCurlingEventType").value = "";
  document.getElementById("aeCurlingDraw").value = "";
  document.getElementById("aeCurlingNote").value = "";
  document.getElementById("aeDate").value = "";
  document.getElementById("aeVenue").value = "";
  document.getElementById("aeLocation").value = "";
  document.getElementById("aeTag").value = "";
  updateAddEventForm();
}

function fillAddEventForm(event) {
  const venueParts = extractVenueLocation(event.v);

  clearAddEventForm();

  document.getElementById("aeCategory").value = event.t || "concert";
  updateAddEventForm();

  if (["concert", "comedy", "kids", "cancelled"].includes(event.t)) {
    document.getElementById("aeSimpleHeadliner").value = event.a || "";
    document.getElementById("aeSimpleSupport").value = event.o || "";
  }

  if (event.t === "festival") {
    document.getElementById("aeFestivalName").value = event.a || "";
    document.getElementById("aeFestivalHeadliner").value = event.festivalHeadliner || "";
    document.getElementById("aeFestivalSupport").value = event.o || "";
  }

  if (event.t === "theatre") {
    document.getElementById("aeTheatreTitle").value = event.a || "";
    document.getElementById("aeTheatreSupport").value = event.o || "";
  }

  if (event.t === "wrestling") {
    document.getElementById("aePromotion").value = event.promotion || "";
    if (event.promotion === "Other") {
      document.getElementById("aeCustomPromotion").value = event.customPromotion || "";
    }
    document.getElementById("aeWrestlingEvent").value = event.eventName || "";
  }

  if (event.t === "sport") {
    document.getElementById("aeSportType").value = event.sportType || "";
    updateSportFields();

    if (event.sportType === "other") {
      document.getElementById("aeCustomSportType").value = event.customSportType || "";
      document.getElementById("aeCustomLeague").value = event.customLeague || "";
    } else if (event.sportType === "curling") {
      document.getElementById("aeCurlingEventType").value = event.eventType || "";
      document.getElementById("aeCurlingDraw").value = event.drawNumber || "";
      document.getElementById("aeCurlingNote").value = event.sportNote || "";
    } else {
      populateLeagueOptions(event.sportType || "", event.league || "");
      if (event.league === "Other") {
        document.getElementById("aeCustomLeague").value = event.customLeague || "";
      }
      document.getElementById("aeAwayTeam").value = event.awayTeam || "";
      document.getElementById("aeHomeTeam").value = event.homeTeam || "";
      document.getElementById("aeSportNote").value = event.sportNote || "";
    }

    updateSportFields();
  }

  document.getElementById("aeDate").value = event.isoDate || "";
  document.getElementById("aeVenue").value = venueParts.name || "";
  document.getElementById("aeLocation").value = venueParts.location || "";

  const extraTag = (event.tags || [])
    .map(tag => tag[1])
    .filter(tagText => ![
      "Concert",
      "Festival",
      "Sport",
      "Wrestling",
      "Comedy",
      "Theatre",
      "Kids Show",
      "Curling",
      "Cancelled",
      "Hockey",
      "Football",
      "Baseball",
      "Basketball",
      "Soccer"
    ].includes(tagText))[0] || "";

  document.getElementById("aeTag").value = extraTag;
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
    sport: { emoji: "🏟️", gradient: "#001a10,#1a0020", tagClass: "tb", tagText: "Sport" },
    wrestling: { emoji: "🤼", gradient: "#1a0800,#0a0a0a", tagClass: "to", tagText: "Wrestling" },
    comedy: { emoji: "😂", gradient: "#1a1505,#051a15", tagClass: "ty", tagText: "Comedy" },
    theatre: { emoji: "🎭", gradient: "#05051a,#1a051a", tagClass: "to", tagText: "Theatre" },
    kids: { emoji: "🧸", gradient: "#1a0520,#051a15", tagClass: "tk", tagText: "Kids Show" },
    curling: { emoji: "🥌", gradient: "#051a15,#1a0510", tagClass: "tg", tagText: "Curling" },
    cancelled: { emoji: "❌", gradient: "#200505,#050520", tagClass: "tr", tagText: "Cancelled" }
  };
  return map[category] || map.concert;
}

function getSportEmoji(sportType) {
  const st = (sportType || "").toLowerCase();
  if (st === "baseball") return "⚾";
  if (st === "football") return "🏈";
  if (st === "hockey") return "🏒";
  if (st === "basketball") return "🏀";
  if (st === "soccer") return "⚽";
  if (st === "curling") return "🥌";
  return "🏟️";
}

function getAutoImageQuery(event) {
  if (event.t === "sport") {
    const sportType = getDisplaySportType(event).toLowerCase();
    if (sportType.includes("baseball")) return "baseball stadium";
    if (sportType.includes("football")) return "NFL football";
    if (sportType.includes("hockey")) return "NHL hockey";
    if (sportType.includes("basketball")) return "NBA basketball";
    if (sportType.includes("soccer")) return "soccer stadium";
    if (sportType.includes("curling")) return "curling sport";
    return "sports arena";
  }

  if (event.t === "wrestling") {
    return getDisplayPromotion(event) || "professional wrestling";
  }

  return event.img || event.a;
}

function buildEventTitle(category) {
  if (["concert", "comedy", "kids", "cancelled"].includes(category)) {
    return document.getElementById("aeSimpleHeadliner").value.trim();
  }

  if (category === "festival") {
    return document.getElementById("aeFestivalName").value.trim();
  }

  if (category === "theatre") {
    return document.getElementById("aeTheatreTitle").value.trim();
  }

  if (category === "sport") {
    const sportType = document.getElementById("aeSportType").value.trim().toLowerCase();

    if (sportType === "curling") {
      const eventType = document.getElementById("aeCurlingEventType").value.trim();
      const drawNumber = document.getElementById("aeCurlingDraw").value.trim();
      if (eventType && drawNumber) return `${eventType} — Draw ${drawNumber}`;
      return eventType || drawNumber || "";
    }

    const league = getSelectedLeagueLabel();
    const awayTeam = document.getElementById("aeAwayTeam").value.trim();
    const homeTeam = document.getElementById("aeHomeTeam").value.trim();
    const prefix = league || titleCase(getSelectedSportTypeLabel());

    if (prefix && awayTeam && homeTeam) {
      return `${prefix}: ${awayTeam} vs ${homeTeam}`;
    }
    return "";
  }

  if (category === "wrestling") {
    const promotion = getSelectedPromotionLabel();
    const eventName = document.getElementById("aeWrestlingEvent").value.trim();

    if (promotion && eventName) return `${promotion}: ${eventName}`;
    return eventName || promotion || "";
  }

  return "";
}

function buildSupportText(category) {
  if (["concert", "comedy", "kids", "cancelled"].includes(category)) {
    return document.getElementById("aeSimpleSupport").value.trim();
  }

  if (category === "festival") {
    return document.getElementById("aeFestivalSupport").value.trim();
  }

  if (category === "theatre") {
    return document.getElementById("aeTheatreSupport").value.trim();
  }

  return "";
}

function buildExtraTags(category) {
  const tags = [];
  const customTag = document.getElementById("aeTag").value.trim();

  if (category === "sport") {
    const sportTypeLabel = getSelectedSportTypeLabel();
    const leagueLabel = getSelectedLeagueLabel();
    const sportType = document.getElementById("aeSportType").value.trim().toLowerCase();
    const note = sportType === "curling"
      ? document.getElementById("aeCurlingNote").value.trim()
      : document.getElementById("aeSportNote").value.trim();

    if (sportTypeLabel) tags.push(["ta", sportTypeLabel]);
    if (leagueLabel) tags.push(["ta", leagueLabel]);
    if (note) tags.push(["ta", note]);
  }

  if (category === "wrestling") {
    const promotionLabel = getSelectedPromotionLabel();
    if (promotionLabel) tags.push(["ta", promotionLabel]);
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
  const displayVenue = venueKey === "CANADA LIFE CENTRE"
    ? "CANADA LIFE CENTRE"
    : venueKey === "SASKTEL CENTRE"
    ? "SASKTEL CENTRE"
    : venueKey === "PRINCESS AUTO STADIUM"
    ? "PRINCESS AUTO STADIUM"
    : venueKey === "RBC CONVENTION CENTRE"
    ? "RBC CONVENTION CENTRE"
    : venueKey === "MALL OF AMERICA FIELD"
    ? "MALL OF AMERICA FIELD"
    : venueUpper;

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
    y: year,
    img: ""
  };

  if (category === "sport") {
    const sportType = document.getElementById("aeSportType").value.trim().toLowerCase();
    const leagueLabel = getSelectedLeagueLabel();

    newEvent.sportType = sportType;
    newEvent.e = getSportEmoji(sportType);
    newEvent.img = "";

    if (sportType === "other") {
      newEvent.customSportType = document.getElementById("aeCustomSportType").value.trim();
      newEvent.customLeague = document.getElementById("aeCustomLeague").value.trim();
      newEvent.awayTeam = document.getElementById("aeAwayTeam").value.trim();
      newEvent.homeTeam = document.getElementById("aeHomeTeam").value.trim();
      newEvent.sportNote = document.getElementById("aeSportNote").value.trim();
      newEvent.league = "Other";
    } else if (sportType === "curling") {
      newEvent.eventType = document.getElementById("aeCurlingEventType").value.trim();
      newEvent.drawNumber = document.getElementById("aeCurlingDraw").value.trim();
      newEvent.sportNote = document.getElementById("aeCurlingNote").value.trim();
      newEvent.league = newEvent.eventType;
      newEvent.img = "curling sport";
    } else {
      newEvent.league = document.getElementById("aeLeague").value.trim();
      newEvent.customLeague = newEvent.league === "Other" ? document.getElementById("aeCustomLeague").value.trim() : "";
      newEvent.awayTeam = document.getElementById("aeAwayTeam").value.trim();
      newEvent.homeTeam = document.getElementById("aeHomeTeam").value.trim();
      newEvent.sportNote = document.getElementById("aeSportNote").value.trim();
      newEvent.img = "";
    }

    if (leagueLabel && !newEvent.tags.some(tag => tag[1] === leagueLabel)) {
      newEvent.tags.push(["ta", leagueLabel]);
    }
  }

  if (category === "festival") {
    newEvent.festivalHeadliner = document.getElementById("aeFestivalHeadliner").value.trim();
  }

  if (category === "wrestling") {
    newEvent.promotion = document.getElementById("aePromotion").value.trim();
    newEvent.customPromotion = newEvent.promotion === "Other" ? document.getElementById("aeCustomPromotion").value.trim() : "";
    newEvent.eventName = document.getElementById("aeWrestlingEvent").value.trim();
  }

  ensureEventHasId(newEvent);

  if (editingEventId) {
    newEvent.id = editingEventId;

    const eventIndex = S.findIndex(e => {
      ensureEventHasId(e);
      return e.id === editingEventId;
    });

    if (eventIndex !== -1) {
      S[eventIndex] = newEvent;
    }

    const stored = getStoredCustomEvents();
    const storedIndex = stored.findIndex(e => {
      ensureEventHasId(e);
      return e.id === editingEventId;
    });

    if (storedIndex !== -1) {
      stored[storedIndex] = newEvent;
      saveStoredCustomEvents(stored);
    }

    editingEventId = null;

    closeAddEventModal();
    render();
    switchScreen("shows");
    toast("Event Updated");
    return;
  }

  const stored = getStoredCustomEvents();
  stored.push(newEvent);
  saveStoredCustomEvents(stored);

  S.push(newEvent);

  closeAddEventModal();
  render();
  switchScreen("shows");
  toast("Event Added");
}

document.getElementById("addEventOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("addEventOverlay")) {
    closeAddEventModal();
  }
});

mergeStoredEventsIntoS();
applyStoredEventOverrides();
updateHeaderLogo();
setAddEventHeading();
updateAddEventForm();
render();
renderStats();
renderMap();
