// kiosk.js — شاشة اللمس: إعداد محطة الشاشة نفسها لمرة واحدة (يُحفظ بالجهاز)، ثم الطالبة تختار وجهتها فقط

applyLang();
document.getElementById('lang-toggle').addEventListener('click', (e) => {
  e.stopPropagation();
  setLang(getLang() === 'ar' ? 'en' : 'ar');
});
document.addEventListener('langchange', () => {
  if (document.getElementById('destinations-view').classList.contains('active')) renderDestinations();
  if (document.getElementById('arrivals-view').classList.contains('active') && currentDestId) {
    loadArrivals(currentDestId, currentDestName);
  }
});

const HOME_STATION_KEY = 'kiosk_home_station_id';
const HOME_STATION_NAME_KEY = 'kiosk_home_station_name';

let buildingsCache = [];
let stationsCache = [];
let allRoutesCache = [];
let allBusesCache = [];
let currentDestId = null;
let currentDestName = '';
let miniMap = null;
let miniMapMarkers = [];

function busNumber(name) { const m = (name || '').match(/(\d+)/); return m ? m[1] : '•'; }
function getHomeStationId() { return localStorage.getItem(HOME_STATION_KEY); }

/* ---------------- إعداد الشاشة (مرة واحدة) ---------------- */
async function checkSetup() {
  const homeId = getHomeStationId();
  if (homeId) {
    showIdle();
  } else {
    await showSetup();
  }
}

async function showSetup() {
  document.getElementById('setup-view').style.display = 'flex';
  document.getElementById('idle-view').style.display = 'none';
  document.getElementById('destinations-view').classList.remove('active');
  document.getElementById('arrivals-view').classList.remove('active');

  if (!stationsCache.length) stationsCache = await (await fetch('/api/stations')).json();
  const lang = getLang();
  document.getElementById('setup-grid').innerHTML = stationsCache.map((s) => `
    <div class="dest-card" data-station-id="${s.id}">
      <div class="dest-icon">📍</div>
      <h3>${lang === 'ar' ? s.name_ar : s.name_en}</h3>
    </div>`).join('');
  document.querySelectorAll('#setup-grid .dest-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.stationId;
      const station = stationsCache.find((s) => s.id == id);
      localStorage.setItem(HOME_STATION_KEY, id);
      localStorage.setItem(HOME_STATION_NAME_KEY, JSON.stringify({ ar: station.name_ar, en: station.name_en }));
      document.getElementById('setup-view').style.display = 'none';
      showIdle();
    });
  });
}

document.getElementById('settings-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  if (confirm('هل تريد إعادة ضبط محطة هذه الشاشة؟')) {
    localStorage.removeItem(HOME_STATION_KEY);
    localStorage.removeItem(HOME_STATION_NAME_KEY);
    showSetup();
  }
});

/* ---------------- الحالة الافتراضية ---------------- */
function showIdle() {
  document.getElementById('setup-view').style.display = 'none';
  document.getElementById('idle-view').style.display = 'flex';
  document.getElementById('destinations-view').classList.remove('active');
  document.getElementById('arrivals-view').classList.remove('active');

  const nameJson = localStorage.getItem(HOME_STATION_NAME_KEY);
  if (nameJson) {
    const name = JSON.parse(nameJson);
    document.getElementById('idle-station-label').textContent = (getLang() === 'ar' ? 'أنتِ الآن عند: ' : 'You are at: ') + (getLang() === 'ar' ? name.ar : name.en);
  }
}

/* ---------------- اختيار الوجهة ---------------- */
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

/* ---------------- الخريطة المصغّرة ---------------- */
function ensureMiniMap() {
  if (miniMap) return miniMap;
  miniMap = L.map('mini-map', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);
  return miniMap;
}

function updateMiniMap(originStation, destStation, relevantRoute) {
  try {
    const map = ensureMiniMap();
    miniMapMarkers.forEach((m) => map.removeLayer(m));
    miniMapMarkers = [];

    // مناطق التكبير: بس نقطة الانطلاق والوجهة ومسار الرحلة (مو كل الحافلات، حتى ما يتوسّع الزوم بلا داعي)
    const focusBounds = [];

    // كل المسارات (نفس شكل الصفحة الرئيسية بالكامل)
    allRoutesCache.forEach((route) => {
      if (Array.isArray(route.geometry) && route.geometry.length > 1) {
        const validPoints = route.geometry.filter((p) =>
          Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1])
        );
        if (validPoints.length > 1) {
          const isRelevant = relevantRoute && route.id === relevantRoute.id;
          const line = L.polyline(validPoints, { color: route.color || '#2563eb', weight: isRelevant ? 5 : 3, opacity: isRelevant ? 0.85 : 0.35 }).addTo(map);
          miniMapMarkers.push(line);
          if (isRelevant) validPoints.forEach((p) => focusBounds.push(p));
        }
      }
    });

    // كل الحافلات (نفس الصفحة الرئيسية)
    allBusesCache.forEach((b) => {
      if (b.current_lat == null || b.current_lng == null) return;
      const color = (b.route && b.route.color) || '#2eb386';
      const busIcon = L.divIcon({ className: '', html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;font-size:11px;color:white;font-weight:800">🚌</div>`, iconSize: [24, 24] });
      miniMapMarkers.push(L.marker([b.current_lat, b.current_lng], { icon: busIcon }).addTo(map));
    });

    if (originStation) {
      const originIcon = L.divIcon({ className: '', html: `<div style="background:#145c46;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`, iconSize: [18, 18] });
      miniMapMarkers.push(L.marker([originStation.lat, originStation.lng], { icon: originIcon }).addTo(map));
      focusBounds.push([originStation.lat, originStation.lng]);
    }

    if (destStation) {
      const destIcon = L.divIcon({ className: '', html: `<div style="background:#c9a668;width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.5)"></div>`, iconSize: [18, 18] });
      miniMapMarkers.push(L.marker([destStation.lat, destStation.lng], { icon: destIcon }).addTo(map));
      focusBounds.push([destStation.lat, destStation.lng]);
    }

    if (focusBounds.length > 1) map.fitBounds(L.latLngBounds(focusBounds), { padding: [40, 40], maxZoom: 17 });
    else if (focusBounds.length === 1) map.setView(focusBounds[0], 17);

    setTimeout(() => map.invalidateSize(), 100);
  } catch (e) {
    console.error('خطأ برسم الخريطة المصغّرة:', e.message);
  }
}

/* ---------------- الحافلات القادمة ---------------- */
async function loadArrivals(destId, destName) {
  currentDestId = destId;
  currentDestName = destName;
  document.getElementById('destinations-view').classList.remove('active');
  document.getElementById('arrivals-view').classList.add('active');
  document.getElementById('arrivals-dest-name').textContent = destName;

  const lang = getLang();
  const homeStationId = getHomeStationId();
  const data = await (await fetch(`/api/stations/${homeStationId}/to-building/${destId}/arrivals`)).json();
  const el = document.getElementById('arrivals-list');
  const noteEl = document.getElementById('nearest-station-note');

  [allRoutesCache, allBusesCache] = await Promise.all([
    fetch('/api/routes').then((r) => r.json()),
    fetch('/api/buses').then((r) => r.json()),
  ]);

  const relevantRoute = data.buses && data.buses[0] ? data.buses[0].route : null;
  updateMiniMap(data.originStation, data.destStation, relevantRoute);

  if (!data.destStation) {
    noteEl.textContent = '';
    el.innerHTML = `<div class="no-buses">${lang === 'ar' ? 'لا توجد محطات مسجّلة بعد بالنظام' : 'No stations registered yet'}</div>`;
    return;
  }

  const destStationName = lang === 'ar' ? data.destStation.name_ar : data.destStation.name_en;
  noteEl.textContent = lang === 'ar' ? `أقرب محطة للوجهة: ${destStationName}` : `Nearest station to destination: ${destStationName}`;

  if (data.noRouteFound) {
    el.innerHTML = `<div class="no-buses">${lang === 'ar' ? 'لا يوجد مسار يربط محطتك الحالية بهذه الوجهة مباشرة' : 'No route directly connects your current station to this destination'}</div>`;
    return;
  }

  if (!data.buses.length) {
    el.innerHTML = `<div class="no-buses">${lang === 'ar' ? 'لا توجد حافلات قادمة حاليًا على هذا المسار' : 'No buses currently arriving on this route'}</div>`;
    return;
  }

  el.innerHTML = data.buses.map((b) => {
    const routeColor = (b.route && b.route.color) || '#2eb386';
    const routeName = b.route ? (lang === 'ar' ? b.route.name_ar : b.route.name_en) : '—';
    const etaMinutes = b._etaSeconds == null ? '—' : (b._etaSeconds < 60 ? '<1' : Math.round(b._etaSeconds / 60));
    return `
      <div class="arrival-card" style="border-inline-start-color:${routeColor}">
        <div class="arrival-bus-circle" style="background:${routeColor}">${busNumber(b.name)}</div>
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
document.getElementById('idle-view').addEventListener('click', (e) => { if (e.target.id !== 'lang-toggle' && e.target.id !== 'settings-btn') showDestinations(); });
document.getElementById('close-btn').addEventListener('click', showIdle);
document.getElementById('back-btn').addEventListener('click', showDestinations);

/* ---------------- العودة التلقائية للحالة الافتراضية بعد 20 ثانية من عدم اللمس ---------------- */
let idleTimer;
function resetIdleTimer() { clearTimeout(idleTimer); idleTimer = setTimeout(showIdle, 20000); }
document.addEventListener('click', resetIdleTimer);
resetIdleTimer();

/* ---------------- تحديث تلقائي كل 15 ثانية ---------------- */
setInterval(() => {
  if (currentDestId && document.getElementById('arrivals-view').classList.contains('active')) {
    loadArrivals(currentDestId, currentDestName);
  }
}, 15000);

/* ---------------- التشغيل ---------------- */
checkSetup();
