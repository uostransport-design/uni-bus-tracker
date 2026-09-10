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
  if (testOverrideStationId) showTestBanner();
});

const HOME_STATION_KEY = 'kiosk_home_station_id';
const HOME_STATION_NAME_KEY = 'kiosk_home_station_name';

let buildingsCache = [];
let stationsCache = [];
let allRoutesCache = [];
let currentDestId = null;
let currentDestName = '';
let miniMap = null;
let miniMapMarkers = [];

function busNumber(name) { const m = (name || '').match(/(\d+)/); return m ? m[1] : '•'; }
function getHomeStationId() { return testOverrideStationId || localStorage.getItem(HOME_STATION_KEY); }
let testOverrideStationId = null;

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
  hideTestBanner();

  if (testOverrideStationId) {
    const st = allStationsForTest.find((s) => s.id == testOverrideStationId);
    if (st) {
      document.getElementById('idle-station-label').textContent = (getLang() === 'ar' ? '🧪 وضع اختبار — أنتِ الآن عند: ' : '🧪 Test mode — You are at: ') + (getLang() === 'ar' ? st.name_ar : st.name_en);
      return;
    }
  }
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
  if (testOverrideStationId) showTestBanner(); else hideTestBanner();
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
  grid.innerHTML = buildingsCache.map((b) => {
    const collegeIconUrl = getBuildingIconUrl(b.name_en);
    const iconHtml = collegeIconUrl
      ? `<img src="${collegeIconUrl}" style="width:44px;height:44px;object-fit:contain;margin-bottom:12px" />`
      : `<div class="dest-icon" style="color:${b.color || '#2eb386'}">${getIconSvg(b.icon)}</div>`;
    return `
    <div class="dest-card" data-building-id="${b.id}" style="border-color:${b.color || '#2eb386'}33">
      ${iconHtml}
      <h3>${lang === 'ar' ? b.name_ar : b.name_en}</h3>
    </div>`;
  }).join('');
  grid.querySelectorAll('.dest-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.buildingId);
      const building = buildingsCache.find((b) => b.id === id);
      loadArrivals(id, lang === 'ar' ? building.name_ar : building.name_en);
    });
  });
}

// أيقونة القبة الرسمية الموحّدة (مستخرجة من دليل الهوية البصرية) — تُستخدم لكل المباني اللي ما لها أيقونة كلية مخصصة
const DOME_SVG = '<svg viewBox="0 0 658 573" xmlns="http://www.w3.org/2000/svg"><g transform="translate(0,573) scale(0.1,-0.1)" fill="currentColor"><path d="M3251 5299 l-43 -291 26 -27 c33 -34 33 -61 1 -91 -32 -30 -34 -84 -3 -117 12 -13 20 -24 17 -26 -2 -2 -86 -66 -187 -142 -100 -76 -181 -139 -179 -141 2 -2 48 8 103 22 78 21 131 27 256 31 171 6 272 -4 399 -41 43 -13 76 -19 73 -14 -3 4 -78 63 -167 129 -89 67 -172 131 -185 142 l-22 21 20 21 c29 31 27 85 -5 115 -32 30 -32 57 1 91 l27 28 -43 288 c-23 158 -43 289 -44 290 -2 2 -22 -128 -45 -288z M2100 4003 c-144 -88 -308 -219 -489 -388 -72 -68 -307 -335 -412 -470 -155 -198 -304 -412 -469 -670 l-83 -129 7 -111 c8 -119 40 -324 60 -382 l12 -36 34 44 c74 94 229 279 322 383 82 90 98 114 98 141 0 53 37 253 65 350 132 461 449 926 845 1238 119 94 121 99 10 30z M4410 4047 c0 -2 37 -32 83 -68 275 -213 542 -540 703 -860 102 -203 180 -451 204 -644 17 -131 16 -129 69 -187 75 -82 238 -273 320 -376 41 -50 75 -92 77 -92 15 0 62 279 70 420 l7 106 -63 100 c-426 671 -823 1142 -1201 1427 -109 83 -269 186 -269 174z M4202 3944 c194 -197 300 -374 379 -631 67 -220 99 -532 81 -806 l-10 -158 46 -42 c73 -65 352 -345 420 -422 l61 -69 65 134 c35 74 85 193 111 265 46 129 47 130 29 160 -50 85 -314 495 -437 679 -319 475 -551 754 -777 937 -61 50 -59 47 32 -47z M2415 3989 c-269 -217 -606 -658 -1088 -1423 l-138 -218 17 -52 c29 -90 91 -239 149 -362 l56 -119 62 70 c72 82 339 351 414 417 l52 45 -10 159 c-26 414 46 811 196 1089 67 123 139 220 248 333 55 56 98 102 96 102 -2 -1 -26 -19 -54 -41z M3286 3925 c-35 -500 -151 -919 -397 -1432 -59 -125 -67 -149 -56 -162 59 -72 302 -344 373 -420 l89 -94 62 64 c94 99 383 421 401 448 15 22 14 26 -10 70 -15 25 -54 107 -88 181 -211 460 -312 834 -351 1295 -6 71 -12 135 -13 140 -2 6 -6 -35 -10 -90z M2813 3933 c-101 -158 -170 -286 -350 -653 -295 -601 -364 -731 -461 -869 l-45 -64 31 -61 c77 -149 283 -466 302 -466 4 0 29 24 55 53 43 47 214 225 387 402 l68 71 -34 134 c-45 178 -74 352 -88 534 -25 319 36 673 156 921 19 38 33 71 32 73 -2 1 -26 -32 -53 -75z M3759 3930 c184 -402 208 -890 71 -1428 l-40 -155 102 -106 c57 -58 153 -158 214 -221 62 -63 130 -135 153 -160 l41 -45 20 25 c76 94 310 471 310 500 0 5 -36 64 -81 132 -56 86 -167 297 -369 703 -248 497 -360 705 -442 817 -10 12 0 -15 21 -62z M4725 3986 c325 -191 537 -367 738 -608 242 -293 440 -691 487 -984 5 -31 16 -64 23 -73 27 -31 211 -297 274 -395 l63 -100 0 75 c0 229 -84 531 -222 799 -253 492 -747 970 -1311 1269 -84 44 -117 55 -52 17z M1773 3947 c-328 -184 -565 -366 -821 -632 -404 -418 -646 -916 -669 -1374 l-5 -116 92 140 c51 77 131 194 178 259 73 102 87 128 94 175 22 141 110 384 200 551 224 417 557 765 950 992 48 28 88 52 88 54 0 9 -19 0 -107 -49z M170 1460 c-15 -15 -20 -33 -20 -70 l0 -50 3145 0 3145 0 0 50 c0 37 -5 55 -20 70 -20 20 -33 20 -3125 20 -3092 0 -3105 0 -3125 -20z M340 995 c0 -2 7 -30 15 -62 23 -89 44 -315 51 -565 l7 -228 174 0 173 0 0 93 c1 255 31 619 60 717 5 19 10 38 10 42 0 5 -110 8 -245 8 -135 0 -245 -2 -245 -5z M1175 978 c53 -164 74 -327 82 -615 l6 -223 244 0 243 0 0 78 c0 268 37 607 79 727 l19 55 -340 0 -340 0 7 -22z M2205 951 c63 -125 95 -310 102 -593 l6 -218 342 0 342 0 6 213 c7 281 41 477 102 598 l25 49 -475 0 -475 0 25 -49z M3485 950 c63 -125 105 -384 105 -652 l0 -158 344 0 343 0 6 213 c7 281 41 477 102 598 l25 49 -475 0 -475 0 25 -50z M4750 996 c0 -2 11 -46 25 -98 33 -124 53 -305 61 -553 l7 -205 244 0 243 0 0 128 c0 251 30 525 71 657 10 33 19 63 19 68 0 4 -151 7 -335 7 -184 0 -335 -2 -335 -4z M5764 985 c11 -29 36 -182 46 -283 5 -56 13 -206 17 -332 l6 -230 172 0 172 0 7 218 c10 308 27 480 61 615 l7 27 -247 0 c-215 0 -246 -2 -241 -15z"/></g></svg>';
function getIconSvg(key) { return DOME_SVG; }

// خريطة ربط الأيقونات الرسمية للكليات (مستخرجة من دليل الهوية البصرية) بالمباني حسب اسمها الإنجليزي
const COLLEGE_ICON_MAP = {
  'college of medicine': 'medicine',
  'college of dental medicine': 'dental_medicine',
  'college of pharmacy and health sciences': 'pharmacy',
  'college of pharmacy': 'pharmacy',
  'college of sharia and islamic studies': 'sharia_islamic',
  'college of law': 'law',
  'college of arts, humanities and social sciences': 'arts_humanities',
  'college of computing and informatics': 'computing_informatics',
  'college of business administration': 'business_admin',
  'college of communication': 'communication',
  'college of engineering': 'engineering',
};
function getBuildingIconUrl(nameEn) {
  return null; // تم تعطيل الأيقونات المخصصة مؤقتًا — كل المباني تستخدم القبة العامة الموحّدة
}

const STATION_PIN_SVG = '<svg viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';

/* ---------------- الخريطة المصغّرة ---------------- */
function ensureMiniMap() {
  if (miniMap) return miniMap;
  miniMap = L.map('mini-map', { zoomControl: false, attributionControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap);
  return miniMap;
}

function updateMiniMap(originStation, destStation, relevantRoute, destBuilding, relevantBuses) {
  relevantBuses = relevantBuses || [];
  try {
    const map = ensureMiniMap();
    miniMapMarkers.forEach((m) => map.removeLayer(m));
    miniMapMarkers = [];

    // مناطق التكبير: بس نقطة الانطلاق والوجهة ومسار الرحلة (مو كل الحافلات، حتى ما يتوسّع الزوم بلا داعي)
    const focusBounds = [];

        // خط المسار المرتبط برحلتك تحديدًا (من محطتك للمبنى المطلوب) — بس هذا الخط، بدون باقي مسارات الجامعة
    if (relevantRoute && Array.isArray(relevantRoute.geometry) && relevantRoute.geometry.length > 1) {
      const validPoints = relevantRoute.geometry.filter((p) =>
        Array.isArray(p) && typeof p[0] === 'number' && typeof p[1] === 'number' && !isNaN(p[0]) && !isNaN(p[1])
      );
      if (validPoints.length > 1) {
        const line = L.polyline(validPoints, { color: relevantRoute.color || '#2563eb', weight: 5, opacity: 0.85 }).addTo(map);
        miniMapMarkers.push(line);
        validPoints.forEach((p) => focusBounds.push(p));
      }
    }

    // محطة الانطلاق (كبينة الانتظار) — تظهر بكبسولة "أنا هنا" واضحة بدل أيقونة محطة عادية
    if (originStation) {
      const hereLabel = getLang() === 'ar' ? '📍 أنا هنا' : '📍 I am here';
      const originIcon = L.divIcon({
        className: '',
        html: `<div style="background:#145c46; color:white; padding:8px 16px; border-radius:20px; font-size:14px; font-weight:800; white-space:nowrap; box-shadow:0 3px 10px rgba(0,0,0,.4); border:2px solid white;">${hereLabel}</div>`,
        iconSize: null, iconAnchor: [45, 15],
      });
      miniMapMarkers.push(L.marker([originStation.lat, originStation.lng], { icon: originIcon }).addTo(map));
      focusBounds.push([originStation.lat, originStation.lng]);
    }

    // محطة الوصول القريبة من الوجهة — نفس شكل الدبوس بلون ذهبي مميّز
    if (destStation) {
      const destIcon = L.divIcon({
        className: '',
        html: `<div style="width:38px;height:38px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))"><div style="background:#c9a668;width:100%;height:100%;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:3px solid white"><div style="transform:rotate(45deg);width:20px;height:20px">${STATION_PIN_SVG}</div></div></div>`,
        iconSize: [38, 38], iconAnchor: [19, 38],
      });
      miniMapMarkers.push(L.marker([destStation.lat, destStation.lng], { icon: destIcon }).addTo(map));
      focusBounds.push([destStation.lat, destStation.lng]);
    }

    // المبنى المختار نفسه (الوجهة) — بأيقونته الرسمية إن وُجدت، وإلا القبة العامة، بارز وأكبر من باقي العلامات
    if (destBuilding) {
      const collegeIconUrl = getBuildingIconUrl(destBuilding.name_en);
      const innerHtml = collegeIconUrl
        ? `<img src="${collegeIconUrl}" style="width:100%;height:100%;object-fit:contain" />`
        : getIconSvg(destBuilding.icon);
      const markerBg = collegeIconUrl ? 'white' : (destBuilding.color || '#2eb386');
      const buildingIcon = L.divIcon({
        className: '',
        html: `<div style="background:${markerBg};width:44px;height:44px;border-radius:50%;border:4px solid white;box-shadow:0 3px 10px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:8px">${innerHtml}</div>`,
        iconSize: [44, 44], iconAnchor: [22, 22],
      });
      miniMapMarkers.push(L.marker([destBuilding.lat, destBuilding.lng], { icon: buildingIcon }).addTo(map));
      focusBounds.push([destBuilding.lat, destBuilding.lng]);
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
  if (testOverrideStationId) showTestBanner(); else hideTestBanner();

  const lang = getLang();
  const homeStationId = getHomeStationId();
  const data = await (await fetch(`/api/stations/${homeStationId}/to-building/${destId}/arrivals`)).json();
  const el = document.getElementById('arrivals-list');
  const noteEl = document.getElementById('nearest-station-note');

  allRoutesCache = await fetch('/api/routes').then((r) => r.json());

  const relevantRoute = data.buses && data.buses[0] ? data.buses[0].route : null;
  const destBuilding = buildingsCache.find((b) => b.id === destId);
  updateMiniMap(data.originStation, data.destStation, relevantRoute, destBuilding, data.buses);

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

/* ---------------- تقييم الخدمة ---------------- */
const ratingAnswers = { punctuality: null, cleanliness: null, driver_behavior: null, had_difficulty: null };

function renderRating() {
  const el = document.getElementById('rating-body');
  const scaleQuestion = (key, label) => `
    <div class="rating-question">
      <h3>${label}</h3>
      <div class="rating-scale" data-key="${key}">
        ${[1, 2, 3, 4, 5].map((n) => `<button data-val="${n}">${n}</button>`).join('')}
      </div>
    </div>`;
  el.innerHTML = `
    ${scaleQuestion('punctuality', 'كم أنتِ راضية عن التزام الحافلات بالمواعيد؟')}
    ${scaleQuestion('cleanliness', 'كيف تقيّمين نظافة وحالة الحافلة؟')}
    ${scaleQuestion('driver_behavior', 'كيف كان تعامل السائق؟')}
    <div class="rating-question">
      <h3>هل واجهتِ أي صعوبة باستخدام النظام (الشاشة/التتبع)؟</h3>
      <div class="rating-yesno" data-key="had_difficulty">
        <button data-val="1">نعم</button>
        <button data-val="0">لا</button>
      </div>
    </div>
    <div class="rating-question">
      <h3>ملاحظة إضافية (اختياري)</h3>
      <div class="rating-note"><textarea id="rating-note-input" rows="3" placeholder="اكتبي ملاحظتك هنا..."></textarea></div>
    </div>
    <button class="rating-submit-btn" id="rating-submit-btn">إرسال التقييم</button>
  `;

  el.querySelectorAll('.rating-scale, .rating-yesno').forEach((group) => {
    const key = group.dataset.key;
    group.querySelectorAll('button').forEach((btn) => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('button').forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        ratingAnswers[key] = Number(btn.dataset.val);
      });
    });
  });

  document.getElementById('rating-submit-btn').addEventListener('click', submitRating);
}

async function submitRating() {
  const note = document.getElementById('rating-note-input').value.trim();
  try {
    await fetch('/api/ratings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ratingAnswers, note: note || null }),
    });
  } catch (e) { /* حتى لو فشل الإرسال، نشكرها ونرجع (تجربة مستخدم أفضل) */ }

  document.getElementById('rating-body').innerHTML = `
    <div class="rating-thankyou">
      <h2>شكرًا لتقييمك 🙏</h2>
      <p>رأيك يساعدنا نطوّر الخدمة</p>
    </div>`;
  setTimeout(showIdleFromRating, 2500);
}

function showIdleFromRating() {
  document.getElementById('rating-view').classList.remove('active');
  document.getElementById('idle-view').style.display = 'flex';
  ratingAnswers.punctuality = null; ratingAnswers.cleanliness = null; ratingAnswers.driver_behavior = null; ratingAnswers.had_difficulty = null;
}

document.getElementById('open-rating-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('idle-view').style.display = 'none';
  document.getElementById('rating-view').classList.add('active');
  renderRating();
});
document.getElementById('close-rating-btn').addEventListener('click', showIdleFromRating);

/* ---------------- استفسار / بلاغ ---------------- */
let phoneNumbers = {};

async function loadPhoneNumbers() {
  try { phoneNumbers = await (await fetch('/api/settings/phones')).json(); }
  catch (e) { phoneNumbers = {}; }
}
loadPhoneNumbers();

function renderComplaintCategories() {
  document.getElementById('complaint-body').innerHTML = `
    <div class="complaint-categories">
      <div class="complaint-cat-card emergency" data-dept="phone_security" data-name="قسم الأمن">
        <div class="cc-icon">🆘</div><h3>طارئ</h3>
      </div>
      <div class="complaint-cat-card" data-dept="phone_maintenance" data-name="قسم الصيانة">
        <div class="cc-icon">🔧</div><h3>عطل بالكبينة (تكييف/إضاءة)</h3>
      </div>
      <div class="complaint-cat-card" data-dept="phone_transport" data-name="قيّم المواصلات">
        <div class="cc-icon">🚌</div><h3>متعلق بالمواصلات</h3>
      </div>
    </div>`;
  document.querySelectorAll('.complaint-cat-card').forEach((card) => {
    card.addEventListener('click', () => showComplaintPhone(card.dataset.dept, card.dataset.name));
  });
}

function showComplaintPhone(deptKey, deptName) {
  const phone = phoneNumbers[deptKey] || '—';
  document.getElementById('complaint-body').innerHTML = `
    <div class="complaint-phone-result">
      <div class="dept-name">رقم التواصل مع ${deptName}</div>
      <div class="phone-num">${phone}</div>
      <a class="call-btn" href="tel:${phone}">📞 اتصال الآن</a>
    </div>
    <div class="complaint-back-link" id="complaint-back-link">← رجوع لاختيار نوع ثاني</div>`;
  document.getElementById('complaint-back-link').addEventListener('click', renderComplaintCategories);
}

function showIdleFromComplaint() {
  document.getElementById('complaint-view').classList.remove('active');
  document.getElementById('idle-view').style.display = 'flex';
}

document.getElementById('open-complaint-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('idle-view').style.display = 'none';
  document.getElementById('complaint-view').classList.add('active');
  renderComplaintCategories();
});
document.getElementById('close-complaint-btn').addEventListener('click', showIdleFromComplaint);

/* ---------------- الأحداث ---------------- */
document.getElementById('tap-prompt').addEventListener('click', (e) => { e.stopPropagation(); showDestinations(); });
document.getElementById('idle-view').addEventListener('click', (e) => {
  const excludedIds = ['lang-toggle', 'settings-btn', 'open-rating-btn', 'open-complaint-btn'];
  if (!excludedIds.includes(e.target.id)) showDestinations();
});
document.getElementById('close-btn').addEventListener('click', showIdle);
document.getElementById('back-btn').addEventListener('click', showDestinations);

/* ---------------- العودة التلقائية للحالة الافتراضية بعد 20 ثانية من عدم اللمس ---------------- */
// let idleTimer;
// function resetIdleTimer() { clearTimeout(idleTimer); idleTimer = setTimeout(showIdle, 20000); }
// document.addEventListener('click', resetIdleTimer);
// resetIdleTimer();

/* ---------------- تحديث تلقائي كل 15 ثانية ---------------- */
setInterval(() => {
  if (currentDestId && document.getElementById('arrivals-view').classList.contains('active')) {
    loadArrivals(currentDestId, currentDestName);
  }
}, 15000);

/* ---------------- 🧪 اختبار محطة (ميزة مؤقتة للتأكد من عمل كل المحطات صح) ---------------- */
let allStationsForTest = [];

function injectTestStationUI() {
  // زر الاختبار بالحالة الافتراضية
  const idleView = document.getElementById('idle-view');
  const testBtn = document.createElement('button');
  testBtn.id = 'test-station-btn';
  testBtn.textContent = '🧪 اختبار محطة (مؤقت)';
  testBtn.style.cssText = 'position:absolute; top:24px; left:50%; transform:translateX(-50%); background:#fef3c7; color:#92400e; border:1.5px solid #f59e0b; border-radius:20px; padding:8px 18px; font-size:13px; font-weight:700; cursor:pointer; z-index:50;';
  testBtn.addEventListener('click', (e) => { e.stopPropagation(); openTestStationPicker(); });
  idleView.appendChild(testBtn);

  // شاشة اختيار محطة الاختبار
  const overlay = document.createElement('div');
  overlay.id = 'test-station-overlay';
  overlay.style.cssText = 'position:fixed; inset:0; background:#ffffff; z-index:200; display:none; flex-direction:column;';
  overlay.innerHTML = `
    <div style="padding:24px 40px; background:#fef3c7; border-bottom:2px solid #f59e0b; display:flex; justify-content:space-between; align-items:center;">
      <div><div style="font-size:20px; font-weight:800; color:#92400e;">🧪 اختبار محطة — اختاري أي محطة لتجربتها</div><div style="font-size:13px; color:#92400e; margin-top:4px;">هذا وضع مؤقت للاختبار فقط، ما يغيّر إعداد الشاشة الحقيقي</div></div>
      <button id="close-test-picker" style="width:44px; height:44px; border-radius:50%; background:white; border:none; font-size:20px; cursor:pointer;">✕</button>
    </div>
    <div id="test-station-grid" style="flex:1; display:grid; grid-template-columns:repeat(4,1fr); gap:16px; padding:30px 40px; overflow-y:auto; align-content:start;"></div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('close-test-picker').addEventListener('click', () => { overlay.style.display = 'none'; });
}

async function openTestStationPicker() {
  if (!allStationsForTest.length) allStationsForTest = await (await fetch('/api/stations')).json();
  const lang = getLang();
  const grid = document.getElementById('test-station-grid');
  grid.innerHTML = allStationsForTest.map((s) => `
    <div class="test-station-card" data-station-id="${s.id}" style="background:white; border:2px solid #eef2ef; border-radius:14px; padding:18px 10px; text-align:center; cursor:pointer;">
      <div style="font-size:26px; margin-bottom:8px;">📍</div>
      <div style="font-size:13.5px; font-weight:700; color:#0a0a0a;">${lang === 'ar' ? s.name_ar : s.name_en}</div>
      <div style="font-size:11px; color:#94a3b8; margin-top:2px;">${s.code || ''}</div>
    </div>`).join('');
  grid.querySelectorAll('.test-station-card').forEach((card) => {
    card.addEventListener('click', () => {
      testOverrideStationId = card.dataset.stationId;
      document.getElementById('test-station-overlay').style.display = 'none';
      showTestBanner();
      showDestinations();
    });
  });
  document.getElementById('test-station-overlay').style.display = 'flex';
}

function showTestBanner() {
  let banner = document.getElementById('test-mode-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'test-mode-banner';
    banner.style.cssText = 'position:fixed; top:0; inset-inline:0; background:#f59e0b; color:white; text-align:center; padding:8px; font-size:13px; font-weight:700; z-index:300; cursor:pointer;';
    banner.addEventListener('click', exitTestMode);
    document.body.appendChild(banner);
  }
  const lang = getLang();
  const st = allStationsForTest.find((s) => s.id == testOverrideStationId);
  const stName = st ? (lang === 'ar' ? st.name_ar : st.name_en) : '';
  banner.textContent = `🧪 وضع اختبار: تعملين الآن كأنك بمحطة "${stName}" — اضغطي هنا للخروج من وضع الاختبار`;
  banner.style.display = 'block';
}
function hideTestBanner() {
  const banner = document.getElementById('test-mode-banner');
  if (banner) banner.style.display = 'none';
}
function exitTestMode() {
  testOverrideStationId = null;
  hideTestBanner();
  showIdle();
}

injectTestStationUI();

/* ---------------- التشغيل ---------------- */
checkSetup();
