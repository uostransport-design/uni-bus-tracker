// route-editor.js — أداة رسم مسار الحافلة يدويًا فوق الخريطة الفعلية
// يدعم: سحب أي نقطة لتحريكها، نقر يمين لحذف نقطة محددة، النقر على الخط لإدراج نقطة بالمنتصف

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
const pointIcon = L.divIcon({ className: '', html: '<div style="background:#dc2626;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 3px rgba(0,0,0,.5);cursor:move"></div>', iconSize: [12, 12] });

const drawnPolyline = L.polyline([], { color: '#dc2626', weight: 5, opacity: 0.85 }).addTo(map);
let points = [];
let markers = [];

function refreshLine() {
  drawnPolyline.setLatLngs(points);
  document.getElementById('point-count').textContent = points.length;
}

function rebuildMarkers() {
  markers.forEach((m) => map.removeLayer(m));
  markers = points.map((p, i) => createMarker(p, i));
  refreshLine();
}

function createMarker(latlng, index) {
  const marker = L.marker(latlng, { draggable: true, icon: pointIcon }).addTo(map);

  marker.on('drag', (e) => {
    points[index] = [e.latlng.lat, e.latlng.lng];
    drawnPolyline.setLatLngs(points);
  });

  marker.on('contextmenu', (e) => {
    L.DomEvent.stopPropagation(e);
    points.splice(index, 1);
    rebuildMarkers();
  });

  return marker;
}

function appendPoint(latlng) {
  points.push([latlng.lat, latlng.lng]);
  markers.push(createMarker(latlng, points.length - 1));
  refreshLine();
}

function findNearestSegmentIndex(latlng) {
  const clickPt = map.latLngToLayerPoint(latlng);
  let bestIndex = 0;
  let bestDist = Infinity;

  for (let i = 0; i < points.length - 1; i++) {
    const a = map.latLngToLayerPoint(points[i]);
    const b = map.latLngToLayerPoint(points[i + 1]);
    const d = distanceToSegment(clickPt, a, b);
    if (d < bestDist) { bestDist = d; bestIndex = i; }
  }
  return bestIndex;
}

function distanceToSegment(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx, projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

drawnPolyline.on('click', (e) => {
  L.DomEvent.stopPropagation(e);
  if (points.length < 2) return;
  const insertIndex = findNearestSegmentIndex(e.latlng);
  points.splice(insertIndex + 1, 0, [e.latlng.lat, e.latlng.lng]);
  rebuildMarkers();
});

map.on('click', (e) => appendPoint(e.latlng));

document.getElementById('undo-btn').addEventListener('click', () => {
  points.pop();
  rebuildMarkers();
});

document.getElementById('clear-btn').addEventListener('click', () => {
  if (!confirm('مسح كل النقاط المرسومة؟')) return;
  points = [];
  rebuildMarkers();
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
    rebuildMarkers();
    map.fitBounds(drawnPolyline.getBounds(), { padding: [40, 40] });
  } else if (route.stations.length) {
    map.fitBounds(L.latLngBounds(route.stations.map((s) => [s.lat, s.lng])), { padding: [60, 60] });
  }
}

loadRoute();
