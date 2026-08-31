// kiosk.js — شاشة اللمس التفاعلية: اختيار المبنى/الكلية، والنظام يجد أقرب محطة ويعرض الحافلات القادمة + خط السير

applyLang();
document.getElementById('lang-toggle').addEventListener('click', (e) => {
  e.stopPropagation();
  setLang(getLang() === 'ar' ? 'en' : 'ar');
});
document.addEventListener('langchange', () => {
  if (document.getElementById('destinations-view').classList.contains('active')) renderDestinations();
  if (document.getElementById('arrivals-view').classList.contains('active') && currentBuildingId) {
    loadArrivals(currentBuildingId, currentBuildingName);
  }
});

let buildingsCache = [];
let currentBuildingId = null;
let currentBuildingName = '';
let miniMap = null;
let miniMapMarkers = [];

function busNumber(name) { const m = (name || '').match(/(\d+)/); return m ? m[1] : '•'; }

function ensureMiniMap() {
  if (miniMap) return miniMap;
  miniMap = L.map('mini-map', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);
  return miniMap;
}

function updateMiniMap(building, station, nearestBus) {
  try {
  const map = ensureMiniMap();
  miniMapMarkers.forEach((m) => map.removeLayer(m));
  miniMapMarkers = [];

  const bounds = [[building.lat, building.lng]];

  const buildingIcon = L.divIcon({ className: '', html: `<div style="background:${building.color || '#2eb386'};width:26px;height:26px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:14px">${building.icon || '🏛️'}</div>`, iconSize: [26, 26] });
  miniMapMarkers.push(L.marker([building.lat, building.lng], { icon: buildingIcon }).addTo(map));

  if (station) {
    const stationIcon = L.divIcon({ className: '', html: `<div style="background:#c9a668;width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4)"></div>`, iconSize: [16, 16] });
    miniMapMarkers.push(L.marker([station.lat, station.lng], { icon: stationIcon }).addTo(map));
    miniMapMarkers.push(L.polyline([[building.lat, building.lng], [station.lat, station.lng]], { color: '#2eb386', weight: 3, dashArray: '6,6', opacity: .7 }).addTo(map));
    bounds.push([station.lat, station.lng]);
  }

    if (nearestBus && nearestBus.route && Array.isArray(nearestBus.route.geometry)) {
    const validPoints = nearestBus.route.geometry.filter((p) =>
      Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1])
    );
    if (validPoints.length > 1) {
      const routeLine = L.polyline(validPoints, { color: nearestBus.route.color || '#2563eb', weight: 4, opacity: .55 }).addTo(map);
      miniMapMarkers.push(routeLine);
    }
  }

  if (nearestBus && nearestBus.current_lat && nearestBus.current_lng) {
    const busColor = nearestBus.color || '#2eb386';
    const busIcon = L.divIcon({ className: '', html: `<div style="background:${busColor};width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:800">🚌</div>`, iconSize: [22, 22] });
    miniMapMarkers.push(L.marker([nearestBus.current_lat, nearestBus.current_lng], { icon: busIcon }).addTo(map));
    bounds.push([nearestBus.current_lat, nearestBus.current_lng]);
  }

  if (bounds.length > 1) map.fitBounds(L.latLngBounds(bounds), { padding: [30, 30] });
  else map.setView([building.lat, building.lng], 17);

    setTimeout(() => map.invalidateSize(), 100);
  } catch (e) {
    console.error('خطأ برسم الخريطة المصغّرة:', e.message);
  }
}

function showIdle() {
  document.getElementById('idle-view').style.display = 'flex';
  document.getElementById('destinations-view').classList.remove('active');
  document.getElementById('arrivals-view').classList.remove('active');
}

async function showDestinations() {
  document.getElementById('idle-view').style.display = 'none';
  document.getElementById('arrivals-view').classList.remove('active');
  document.getElementById('destinations-view').classList.add('active');
  if (!buildingsCache.length) buildingsCache = await (await fetch('/api/buildings')).json();
  renderDestinations();
}

function renderDestinations() {
  const lang = getLang();
  const grid = document.getElementById('dest-grid');
  if (!buildingsCache.length) {
    grid.innerHTML = `<div class="dest-empty">${lang === 'ar' ? 'لا توجد مبانٍ مسجّلة بعد' : 'No buildings registered yet'}</div>`;
    return;
  }
  grid.innerHTML = buildingsCache.map((b) => `
    <div class="dest-card" data-building-id="${b.id}" style="border-color:${b.color || '#2eb386'}33">
      <div class="dest-icon" style="color:${b.color || '#2eb386'}">${b.icon || '🏛️'}</div>
      <h3>${lang === 'ar' ? b.name_ar : b.name_en}</h3>
    </div>`).join('');
  grid.querySelectorAll('.dest-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.buildingId);
      const building = buildingsCache.find((b) => b.id === id);
      loadArrivals(id, lang === 'ar' ? building.name_ar : building.name_en);
    });
  });
}

async function loadArrivals(buildingId, buildingName) {
  currentBuildingId = buildingId;
  currentBuildingName = buildingName;
  document.getElementById('destinations-view').classList.remove('active');
  document.getElementById('arrivals-view').classList.add('active');
  document.getElementById('arrivals-dest-name').textContent = buildingName;

  const lang = getLang();
  const building = buildingsCache.find((b) => b.id === buildingId);
  const data = await (await fetch(`/api/buildings/${buildingId}/arrivals`)).json();
  const el = document.getElementById('arrivals-list');
  const noteEl = document.getElementById('nearest-station-note');

  if (building) updateMiniMap(building, data.station, data.buses && data.buses[0]);

  if (!data.station) {
    if (noteEl) noteEl.textContent = '';
    el.innerHTML = `<div class="no-buses">${lang === 'ar' ? 'لا توجد محطات مسجّلة بعد بالنظام' : 'No stations registered in the system yet'}</div>`;
    return;
  }

  const stationName = lang === 'ar' ? data.station.name_ar : data.station.name_en;
  const distanceText = data.distanceMeters != null
    ? (lang === 'ar' ? `على بعد ${data.distanceMeters} متر تقريبًا سيرًا` : `about ${data.distanceMeters}m walk`)
    : '';
  if (noteEl) {
    noteEl.textContent = lang === 'ar' ? `أقرب محطة: ${stationName} — ${distanceText}` : `Nearest station: ${stationName} — ${distanceText}`;
  }

  if (!data.buses.length) {
    el.innerHTML = `<div class="no-buses">${lang === 'ar' ? 'لا توجد حافلات قادمة لهذه المحطة حاليًا' : 'No buses currently arriving at this station'}</div>`;
    return;
  }

  el.innerHTML = data.buses.map((b) => {
    const color = b.color || '#2eb386';
    const routeName = b.route ? (lang === 'ar' ? b.route.name_ar : b.route.name_en) : '—';
    const etaMinutes = b._etaSeconds == null ? '—' : (b._etaSeconds < 60 ? '<1' : Math.round(b._etaSeconds / 60));
    return `
      <div class="arrival-card" style="border-inline-start-color:${color}">
        <div class="arrival-bus-circle" style="background:${color}">${busNumber(b.name)}</div>
        <div class="arrival-info">
          <div class="route-name">${routeName}</div>
          <div class="bus-name">Bus ${busNumber(b.name)}</div>
        </div>
        <div class="arrival-eta"><div class="num">${etaMinutes}</div><div class="unit">${lang === 'ar' ? 'دقيقة' : 'min'}</div></div>
      </div>`;
  }).join('');
}

/* ---------------- الأحداث ---------------- */
document.getElementById('tap-prompt').addEventListener('click', showDestinations);
document.getElementById('idle-view').addEventListener('click', (e) => { if (e.target.id !== 'lang-toggle') showDestinations(); });
document.getElementById('close-btn').addEventListener('click', showIdle);
document.getElementById('back-btn').addEventListener('click', showDestinations);

/* ---------------- العودة التلقائية للحالة الافتراضية بعد 20 ثانية من عدم اللمس ---------------- */
let idleTimer;
function resetIdleTimer() { clearTimeout(idleTimer); idleTimer = setTimeout(showIdle, 20000); }
document.addEventListener('click', resetIdleTimer);
resetIdleTimer();

/* ---------------- تحديث تلقائي كل 15 ثانية إن كانت الشاشة مفتوحة على مبنى معيّن ---------------- */
setInterval(() => {
  if (currentBuildingId && document.getElementById('arrivals-view').classList.contains('active')) {
    loadArrivals(currentBuildingId, currentBuildingName);
  }
}, 15000);
