// route-editor.js — manual route drawing tool on top of the live map

const token = localStorage.getItem('bus_admin_token');
if (!token) window.location.href = '/admin/login.html';

const params = new URLSearchParams(window.location.search);
const routeId = params.get('route');
if (!routeId) { alert('لم يتم تحديد مسار. ارجع لتبويب المسارات واضغط زر الرسم اليدوي من هناك.'); window.location.href = '/admin/dashboard.html'; }

async function api(path, opts = {}) {
  const res = await fetch('/api/admin' + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

const map = L.map('map').setView([25.2989, 55.4784], 16);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

const stationIcon = L.divIcon({ className: '', html: '<div style="background:#d4a017;width:14px;height:14px;border-radius:50%;border:2px solid #1a1a1a"></div>', iconSize: [14, 14] });
const drawnPolyline = L.polyline([], { color: '#dc2626', weight: 5, opacity: 0.85 }).addTo(map);
let points = [];
let markers = [];

function refreshLine() {
  drawnPolyline.setLatLngs(points);
  document.getElementById('point-count').textContent = points.length;
}

function addPoint(latlng) {
  points.push([latlng.lat, latlng.lng]);
  const m = L.circleMarker(latlng, { radius: 4, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 }).addTo(map);
  markers.push(m);
  refreshLine();
}

map.on('click', (e) => addPoint(e.latlng));

document.getElementById('undo-btn').addEventListener('click', () => {
  points.pop();
  const m = markers.pop();
  if (m) map.removeLayer(m);
  refreshLine();
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('مسح كل النقاط المرسومة؟')) return;
  points = [];
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  refreshLine();
});

document.getElementById('reset-osrm-btn').addEventListener('click', async () => {
  if (!confirm('الرجوع لحساب المسار تلقائيًا على الطرق (سيُلغي أي رسم يدوي محفوظ)؟')) return;
  try {
    await api(`/routes/${routeId}/recompute-geometry`, { method: 'POST' });
    alert('تم إرجاع المسار للحساب التلقائي.');
    window.location.href = '/admin/dashboard.html';
  } catch (err) { alert(err.message); }
});

document.getElementById('save-btn').addEventListener('click', async () => {
  if (points.length < 2) { alert('ارسم نقطتين على الأقل قبل الحفظ.'); return; }
  try {
    await api(`/routes/${routeId}/geometry`, { method: 'PUT', body: JSON.stringify({ points }) });
    alert('✅ تم حفظ المسار اليدوي بنجاح.');
  } catch (err) { alert(err.message); }
});

async function loadRoute() {
  const routes = await api('/routes');
  const route = routes.find((r) => String(r.id) === String(routeId));
  if (!route) { alert('المسار غير موجود'); return; }

  document.getElementById('route-title').textContent = `🖊️ رسم المسار يدويًا — ${route.name_ar}`;

  route.stations.forEach((s) => {
    L.marker([s.lat, s.lng], { icon: stationIcon }).addTo(map).bindPopup(s.name_ar);
  });

  if (route.geometry && route.geometry.length > 1) {
    points = route.geometry.map((p) => [p[0], p[1]]);
    points.forEach((p) => {
      const m = L.circleMarker(p, { radius: 4, color: '#dc2626', fillColor: '#dc2626', fillOpacity: 1 }).addTo(map);
      markers.push(m);
    });
    refreshLine();
    map.fitBounds(drawnPolyline.getBounds(), { padding: [40, 40] });
  } else if (route.stations.length) {
    map.fitBounds(L.latLngBounds(route.stations.map((s) => [s.lat, s.lng])), { padding: [60, 60] });
  }
}

loadRoute();
