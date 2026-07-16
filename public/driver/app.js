// driver/app.js — منطق تطبيق السائق: بدء/إنهاء الرحلة، مشاركة الموقع، البلاغات

const token = localStorage.getItem('bus_driver_token');
const user = JSON.parse(localStorage.getItem('bus_driver_user') || 'null');
if (!token || !user) window.location.href = '/driver/login.html';

document.getElementById('driver-name').textContent = user ? user.name : 'السائق';
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
  const dot = document.getElementById('share-dot');
  if (!btn) return;
  btn.innerHTML = sharing ? '⏸️ إيقاف مشاركة الموقع <span class="share-dot on" id="share-dot"></span>' : '📍 بدء مشاركة الموقع <span class="share-dot" id="share-dot"></span>';
}

document.getElementById('share-toggle')?.addEventListener('click', () => sharing ? stopSharing() : startSharing());

async function loadState() {
  const { trip, bus, route, stations } = await api('/trip/active');
  if (!trip) {
    document.getElementById('no-trip-view').style.display = 'block';
    document.getElementById('trip-view').style.display = 'none';
    const buses = await api('/vehicles');
    document.getElementById('bus-select').innerHTML = buses.map((b) => `<option value="${b.id}">${b.name} — ${b.route_name_ar || 'بدون مسار'}</option>`).join('');
  } else {
    document.getElementById('no-trip-view').style.display = 'none';
    document.getElementById('trip-view').style.display = 'block';
    document.getElementById('trip-bus-name').textContent = bus.name + (bus.plate_number ? ' — ' + bus.plate_number : '');
    document.getElementById('trip-route-name').textContent = route ? route.name_ar : 'بدون مسار محدد';
    document.getElementById('trip-stations').innerHTML = stations.map((s) => s.name_ar).join(' ← ');
    startSharing();
  }
}

document.getElementById('start-trip-btn')?.addEventListener('click', async () => {
  const busId = document.getElementById('bus-select').value;
  try { await api('/trip/start', { method: 'POST', body: JSON.stringify({ bus_id: busId }) }); showMsg('تم بدء الرحلة بنجاح'); loadState(); }
  catch (e) { showMsg(e.message, false); }
});

document.getElementById('end-trip-btn')?.addEventListener('click', async () => {
  if (!confirm('هل تريد إنهاء الرحلة؟')) return;
  stopSharing();
  try { await api('/trip/end', { method: 'POST' }); showMsg('تم إنهاء الرحلة'); loadState(); }
  catch (e) { showMsg(e.message, false); }
});

document.getElementById('out-of-service-btn')?.addEventListener('click', async () => {
  try { await api('/status', { method: 'PUT', body: JSON.stringify({ status: 'out_of_service' }) }); showMsg('تم إيقاف الحافلة عن الخدمة'); }
  catch (e) { showMsg(e.message, false); }
});

window.reportIncident = async (type) => {
  const note = type === 'emergency' ? prompt('صف الحالة الطارئة (اختياري):') : prompt('تفاصيل إضافية (اختياري):');
  try { await api('/incident', { method: 'POST', body: JSON.stringify({ type, note }) }); showMsg('تم إرسال البلاغ'); }
  catch (e) { showMsg(e.message, false); }
};

loadState();
