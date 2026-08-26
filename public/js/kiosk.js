// kiosk.js — شاشة اللمس التفاعلية: اختيار الوجهة وعرض الحافلات القادمة إليها (بيانات حقيقية)

applyLang();
document.getElementById('lang-toggle').addEventListener('click', (e) => {
  e.stopPropagation();
  setLang(getLang() === 'ar' ? 'en' : 'ar');
});
document.addEventListener('langchange', () => {
  if (document.getElementById('destinations-view').classList.contains('active')) renderDestinations();
  if (document.getElementById('arrivals-view').classList.contains('active') && currentStationId) {
    loadArrivals(currentStationId, currentStationName);
  }
});

let stationsCache = [];
let currentStationId = null;
let currentStationName = '';

function busNumber(name) { const m = (name || '').match(/(\d+)/); return m ? m[1] : '•'; }

function showIdle() {
  document.getElementById('idle-view').style.display = 'flex';
  document.getElementById('destinations-view').classList.remove('active');
  document.getElementById('arrivals-view').classList.remove('active');
}

async function showDestinations() {
  document.getElementById('idle-view').style.display = 'none';
  document.getElementById('arrivals-view').classList.remove('active');
  document.getElementById('destinations-view').classList.add('active');
  if (!stationsCache.length) stationsCache = await (await fetch('/api/stations')).json();
  renderDestinations();
}

function renderDestinations() {
  const lang = getLang();
  const grid = document.getElementById('dest-grid');
  if (!stationsCache.length) {
    grid.innerHTML = `<div class="dest-empty">${lang === 'ar' ? 'لا توجد محطات مسجّلة بعد' : 'No stations registered yet'}</div>`;
    return;
  }
  grid.innerHTML = stationsCache.map((s) => `
    <div class="dest-card" data-station-id="${s.id}">
      <div class="dest-icon">📍</div>
      <h3>${lang === 'ar' ? s.name_ar : s.name_en}</h3>
    </div>`).join('');
  grid.querySelectorAll('.dest-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = Number(card.dataset.stationId);
      const station = stationsCache.find((s) => s.id === id);
      loadArrivals(id, lang === 'ar' ? station.name_ar : station.name_en);
    });
  });
}

async function loadArrivals(stationId, stationName) {
  currentStationId = stationId;
  currentStationName = stationName;
  document.getElementById('destinations-view').classList.remove('active');
  document.getElementById('arrivals-view').classList.add('active');
  document.getElementById('arrivals-dest-name').textContent = stationName;

  const lang = getLang();
  const buses = await (await fetch(`/api/stations/${stationId}/buses`)).json();
  const el = document.getElementById('arrivals-list');

  if (!buses.length) {
    el.innerHTML = `<div class="no-buses">${lang === 'ar' ? 'لا توجد حافلات قادمة إلى هذه الوجهة حاليًا' : 'No buses currently arriving at this destination'}</div>`;
    return;
  }

  el.innerHTML = buses.map((b) => {
    const color = b.color || '#2eb386';
    const routeName = b.route ? (lang === 'ar' ? b.route.name_ar : b.route.name_en) : '—';
    const etaText = b._etaSeconds == null ? '—' : (b._etaSeconds < 60 ? (lang === 'ar' ? '<1' : '<1') : Math.round(b._etaSeconds / 60));
    const unitText = b._etaSeconds != null && b._etaSeconds < 60 ? (lang === 'ar' ? 'دقيقة' : 'min') : (lang === 'ar' ? 'دقيقة' : 'min');
    return `
      <div class="arrival-card" style="border-inline-start-color:${color}">
        <div class="arrival-bus-circle" style="background:${color}">${busNumber(b.name)}</div>
        <div class="arrival-info">
          <div class="route-name">${routeName}</div>
          <div class="bus-name">Bus ${busNumber(b.name)}</div>
        </div>
        <div class="arrival-eta"><div class="num">${etaText}</div><div class="unit">${unitText}</div></div>
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

/* ---------------- تحديث تلقائي لقائمة الحافلات القادمة كل 15 ثانية إن كانت الشاشة مفتوحة على وجهة ---------------- */
setInterval(() => {
  if (currentStationId && document.getElementById('arrivals-view').classList.contains('active')) {
    loadArrivals(currentStationId, currentStationName);
  }
}, 15000);
