// driver/app.js — منطق تطبيق السائق مع دعم اللغتين

applyLang();
document.getElementById('lang-toggle').addEventListener('click', () => setLang(getLang() === 'ar' ? 'en' : 'ar'));
document.addEventListener('langchange', () => { updateShareButton(); if (typeof loadState === 'function') loadState(); });

const token = localStorage.getItem('bus_driver_token');
const user = JSON.parse(localStorage.getItem('bus_driver_user') || 'null');
if (!token || !user) window.location.href = '/driver/login.html';

document.getElementById('logout').addEventListener('click', () => {
  stopSharing();
  localStorage.removeItem('bus_driver_token');
  localStorage.removeItem('bus_driver_user');
  window.location.href = '/driver/login.html';
});

async function api(path, opts = {}) {
  const res = await fetch('/api/driver' + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

function showMsg(text, ok = true) {
  const el = document.getElementById('msg');
  el.textContent = text;
  el.className = ok ? 'ok' : 'err';
  setTimeout(() => { el.className = ''; }, 4000);
}

let watchId = null;
let sharing = false;

function startSharing() {
  if (!navigator.geolocation) return showMsg('المتصفح لا يدعم تحديد الموقع', false);
  watchId = navigator.geolocation.watchPosition(
    async (pos) => {
      try {
        await api('/location', {
          method: 'POST',
          body: JSON.stringify({
            lat: pos.coords.latitude, lng: pos.coords.longitude,
            speed: pos.coords.speed ? pos.coords.speed * 3.6 : 0,
            heading: pos.coords.heading || 0,
          }),
        });
      } catch (e) { console.error(e.message); }
    },
    (err) => showMsg('تعذّر الوصول للموقع: ' + err.message, false),
    { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
  );
  sharing = true;
  updateShareButton();
}

function stopSharing() {
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null; sharing = false;
  updateShareButton();
}

function updateShareButton() {
  const btn = document.getElementById('share-toggle');
  if (!btn) return;
  const label = sharing ? t().shareLocationStop : t().shareLocationStart;
  const dotClass = sharing ? 'share-dot on' : 'share-dot';
  btn.innerHTML = `<span>${label}</span> <span class="${dotClass}" id="share-dot"></span>`;
}

document.getElementById('share-toggle')?.addEventListener('click', () => sharing ? stopSharing() : startSharing());

async function loadState() {
  const { trip, bus, route, stations } = await api('/trip/active');
  if (!trip) {
    document.getElementById('no-trip-view').style.display = 'block';
    document.getElementById('trip-view').style.display = 'none';
    const buses = await api('/vehicles');
    const lang = getLang();
    document.getElementById('bus-select').innerHTML = buses.map((b) => {
      const routeName = lang === 'ar' ? (b.route_name_ar || t().noRoute) : (b.route_name_en || t().noRoute);
      return `<option value="${b.id}">${b.name} — ${routeName}</option>`;
    }).join('');
  } else {
    document.getElementById('no-trip-view').style.display = 'none';
    document.getElementById('trip-view').style.display = 'block';
    const lang = getLang();
    document.getElementById('trip-bus-name').textContent = bus.name + (bus.plate_number ? ' — ' + bus.plate_number : '');
    document.getElementById('trip-route-name').textContent = route ? (lang === 'ar' ? route.name_ar : route.name_en) : t().noRoute;
    document.getElementById('trip-stations').innerHTML = stations.map((s) => (lang === 'ar' ? s.name_ar : s.name_en)).join(' ← ');
    startSharing();
  }
}

document.getElementById('start-trip-btn')?.addEventListener('click', async () => {
  const busId = document.getElementById('bus-select').value;
  try { await api('/trip/start', { method: 'POST', body: JSON.stringify({ bus_id: busId }) }); showMsg(t().tripStartedMsg); loadState(); }
  catch (e) { showMsg(e.message, false); }
});

document.getElementById('end-trip-btn')?.addEventListener('click', async () => {
  if (!confirm(t().confirmEndTrip)) return;
  stopSharing();
  try { await api('/trip/end', { method: 'POST' }); showMsg(t().tripEndedMsg); loadState(); }
  catch (e) { showMsg(e.message, false); }
});

document.getElementById('out-of-service-btn')?.addEventListener('click', async () => {
  try { await api('/status', { method: 'PUT', body: JSON.stringify({ status: 'out_of_service' }) }); showMsg(t().outOfServiceMsg); }
  catch (e) { showMsg(e.message, false); }
});

window.reportIncident = async (type) => {
  const note = prompt(getLang() === 'ar' ? 'تفاصيل إضافية (اختياري):' : 'Additional details (optional):');
  try { await api('/incident', { method: 'POST', body: JSON.stringify({ type, note }) }); showMsg(t().incidentSentMsg); }
  catch (e) { showMsg(e.message, false); }
};

loadState();
