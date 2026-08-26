// display.js — يشغّل شاشة العرض العامة: خريطة حية + قائمة حافلات + شريط إعلانات + دعم صفحات المحطات

applyLang();

const stationMatch = window.location.pathname.match(/\/station\/(\d+)/);
let activeStationId = stationMatch ? Number(stationMatch[1]) : null;

const map = L.map('map', { zoomControl: true }).setView([25.2989, 55.4784], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

let routesCache = [];
let stationsCache = [];
let busesCache = [];
const busMarkers = {};

function busNumber(name) { const m = name.match(/(\d+)/); return m ? m[1] : '•'; }

const BUS_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M4 16c0 .88.39 1.67 1 2.22V20a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm9 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zM6 11V6h12v5H6z"/></svg>';

function busIcon(bus) {
  const lang = getLang();
  const routeColor = (bus.route && bus.route.color) || '#2eb386';
  const isDelayed = bus.status === 'delayed';
  const isEmergency = bus.status === 'emergency';
  const showLabel = isDelayed || isEmergency;
  const labelText = isEmergency ? (lang === 'ar' ? 'طارئ' : 'Emergency') : (lang === 'ar' ? 'متأخرة' : 'Delayed');
  const labelClass = isEmergency ? 'bus-delay-label emergency' : 'bus-delay-label';

  const html = `
    <div class="bus-marker-wrap">
      <div class="bus-icon-circle" style="background:${routeColor}">${BUS_SVG}</div>
      ${showLabel ? `<div class="${labelClass}">${labelText}</div>` : ''}
    </div>`;

  return L.divIcon({ className: '', html, iconSize: showLabel ? [100, 56] : [34, 34], iconAnchor: showLabel ? [50, 17] : [17, 17] });
}

const STATION_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" fill="#c9a668"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
const stationIcon = L.divIcon({ className: '', html: `<div class="station-pin">${STATION_SVG}</div>`, iconSize: [20, 20], iconAnchor: [10, 20] });

async function loadRoutes() {
  routesCache = await (await fetch('/api/routes')).json();
  routesCache.forEach((route) => {
    const latlngs = (route.geometry && route.geometry.length > 1) ? route.geometry : route.stations.map((s) => [s.lat, s.lng]);
    if (latlngs.length > 1) L.polyline(latlngs, { color: route.color, weight: 4, opacity: 0.75 }).addTo(map);
  });
}

async function loadStations() {
  stationsCache = await (await fetch('/api/stations')).json();
  stationsCache.forEach((s) => {
    L.marker([s.lat, s.lng], { icon: stationIcon }).addTo(map).bindPopup(t().lang === 'ar' ? s.name_ar : s.name_en);
  });
  populateStationFilter();
}

function populateStationFilter() {
  const sel = document.getElementById('station-filter');
  const lang = t().lang;
  sel.innerHTML = `<option value="">${t().allStations}</option>` +
    stationsCache.map((s) => `<option value="${s.id}">${lang === 'ar' ? s.name_ar : s.name_en}</option>`).join('');
  if (activeStationId) sel.value = activeStationId;
  sel.onchange = () => {
    activeStationId = sel.value ? Number(sel.value) : null;
    renderBusList();
  };
}

async function loadBuses() {
  busesCache = await (await fetch('/api/buses')).json();
  busesCache.forEach((b) => {
    if (b.current_lat && b.current_lng) {
      busMarkers[b.id] = L.marker([b.current_lat, b.current_lng], { icon: busIcon(b) }).addTo(map);
    }
  });
  fitMapToBuses();
  renderBusList();
}

function fitMapToBuses() {
  const pts = Object.values(busMarkers).map((m) => m.getLatLng());
  if (pts.length) map.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 16 });
}

function formatEta(seconds) {
  if (seconds == null) return '—';
  if (seconds < 60) return t().lessThanMinute;
  return Math.round(seconds / 60) + ' ' + t().minutes;
}

function renderBusList() {
  const lang = t().lang;
  let list = busesCache.filter((b) => b.status !== 'out_of_service');
  if (activeStationId) list = list.filter((b) => b.nextStation && b.nextStation.id === activeStationId);
  list.sort((a, b) => (a._etaSeconds ?? 1e9) - (b._etaSeconds ?? 1e9));

  const el = document.getElementById('bus-list');
  if (!list.length) { el.innerHTML = `<div class="empty-state">${t().noBuses}</div>`; return; }

  el.innerHTML = list.map((b) => `
    <div class="bus-card" style="border-inline-start-color:${(b.route && b.route.color) || '#2eb386'}">
      <div class="row1">
        <span class="bus-num">Bus ${busNumber(b.name)}</span>
        <span class="badge ${b.status}">${t().status[b.status] || b.status}</span>
      </div>
      <div class="route-name">${b.route ? (lang === 'ar' ? b.route.name_ar : b.route.name_en) : '—'}</div>
      <div class="stations">
        ${b.currentStation ? `${t().currentStation}: ${lang === 'ar' ? b.currentStation.name_ar : b.currentStation.name_en}<br/>` : ''}
        ${b.nextStation ? `${t().nextStation}: ${lang === 'ar' ? b.nextStation.name_ar : b.nextStation.name_en}` : ''}
      </div>
      ${b._etaSeconds != null ? `<div class="eta">${formatEta(b._etaSeconds)} <small>${t().arrivingIn}</small></div>` : ''}
    </div>`).join('');
}

/* ---------------- الشريط الإخباري (الإعلانات) ---------------- */
async function loadTicker() {
  const anns = await (await fetch('/api/announcements' + (activeStationId ? `?station_id=${activeStationId}` : ''))).json();
  const lang = t().lang;
  const text = anns.map((a) => (lang === 'ar' ? a.message_ar : a.message_en)).join('   •   ') || (lang === 'ar' ? 'لا توجد إعلانات حاليًا' : 'No announcements at the moment');
  document.getElementById('ticker').textContent = text;
}

/* ---------------- الساعة ---------------- */
function tickClock() {
  const lang = t().lang;
  document.getElementById('datetime').textContent = new Date().toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB', { dateStyle: 'medium', timeStyle: 'medium' });
}
setInterval(tickClock, 1000);
tickClock();

/* ---------------- تبديل اللغة ---------------- */
document.getElementById('lang-toggle').addEventListener('click', () => {
  const next = getLang() === 'ar' ? 'en' : 'ar';
  setLang(next);
});
document.addEventListener('langchange', () => {
  document.getElementById('lang-toggle').textContent = getLang() === 'ar' ? 'EN' : 'AR';
  populateStationFilter();
  renderBusList();
  loadTicker();
  Object.entries(busMarkers).forEach(([id, marker]) => {
    const bus = busesCache.find((b) => b.id == id);
    if (bus) marker.setIcon(busIcon(bus));
  });
});

/* ---------------- الاتصال اللحظي ---------------- */
const socket = io();
socket.on('bus:update', (data) => {
  const bus = busesCache.find((b) => b.id === data.busId);
  if (bus) {
    bus.current_lat = data.lat; bus.current_lng = data.lng; bus.status = data.status;
    bus._etaSeconds = data.eta ? data.eta.etaSeconds : null;
    if (data.eta) {
      bus.nextStation = { id: data.eta.nextStationId, name_ar: data.eta.nextStationNameAr, name_en: data.eta.nextStationNameEn };
    }
  }
  if (!busMarkers[data.busId]) {
    busMarkers[data.busId] = L.marker([data.lat, data.lng], { icon: busIcon(bus || { name: '', status: data.status }) }).addTo(map);
  } else {
    busMarkers[data.busId].setLatLng([data.lat, data.lng]);
    busMarkers[data.busId].setIcon(busIcon(bus || { name: '', status: data.status }));
  }
  renderBusList();
});
socket.on('bus:offline', (data) => {
  const bus = busesCache.find((b) => b.id === data.busId);
  if (bus) bus.status = 'out_of_service';
  renderBusList();
});

/* ---------------- التشغيل ---------------- */
(async function init() {
  await loadRoutes();
  await loadStations();
  await loadBuses();
  await loadTicker();
  setInterval(loadTicker, 30000);
})();
