// admin.js — منطق لوحة الإدارة الكامل

const token = localStorage.getItem('bus_admin_token');
const currentUser = JSON.parse(localStorage.getItem('bus_admin_user') || 'null');
if (!token || !currentUser) window.location.href = '/admin/login.html';

const ROLE_LABELS = { super_admin: 'مدير عام', transport_manager: 'مدير النقل', dispatcher: 'موظف تشغيل', viewer: 'مشاهدة فقط', driver: 'سائق' };
document.getElementById('user-name').textContent = currentUser.name;
document.getElementById('user-role').textContent = ROLE_LABELS[currentUser.role] || currentUser.role;
if (currentUser.role !== 'super_admin') { document.getElementById('nav-users').style.display = 'none'; document.getElementById('nav-audit').style.display = 'none'; }

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('bus_admin_token'); localStorage.removeItem('bus_admin_user');
  window.location.href = '/admin/login.html';
});

document.getElementById('change-pw-btn').addEventListener('click', async () => {
  const currentPassword = prompt('كلمة المرور الحالية:');
  if (!currentPassword) return;
  const newPassword = prompt('كلمة المرور الجديدة (8 أحرف على الأقل):');
  if (!newPassword) return;
  try { await api('/../auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }, true); alert('تم تغيير كلمة المرور بنجاح'); }
  catch (e) { alert(e.message); }
});

const canEdit = ['super_admin', 'transport_manager', 'dispatcher'].includes(currentUser.role);

async function api(path, opts = {}, rawAdminPrefix = false) {
  const base = rawAdminPrefix ? '/api/admin' : '/api/admin';
  const res = await fetch(base + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
  if (res.status === 401) { localStorage.removeItem('bus_admin_token'); window.location.href = '/admin/login.html'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

/* ---------------- التبويبات ---------------- */
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    loadTab(btn.dataset.tab);
  });
});
function loadTab(tab) {
  ({ overview: loadOverview, vehicles: loadVehicles, stations: loadStations, routes: loadRoutes,
     drivers: loadDrivers, alerts: loadAlerts, announcements: loadAnnouncements, incidents: loadIncidents,
     reports: loadReports, users: loadUsers, audit: loadAudit }[tab] || (() => {}))();
}
window.closeForm = (name) => document.getElementById('form-' + name).classList.add('hidden');

/* ---------------- نظرة عامة ---------------- */
async function loadOverview() {
  const s = await api('/dashboard/stats');
  const cards = [
    ['blue', s.total, 'إجمالي الحافلات'], ['green', s.in_service, 'في الخدمة'],
    ['amber', s.approaching, 'تقترب من محطة'], ['blue', s.at_station, 'عند المحطة'],
    ['red', s.delayed, 'متأخرة'], ['red', s.emergency, 'حالات طارئة'],
    ['amber', s.out_of_service, 'خارج الخدمة'], ['red', s.offline, 'غير متصلة'],
    ['green', s.activeTrips, 'رحلات نشطة الآن'], ['blue', s.arrivalsLast7Days, 'وصولات آخر 7 أيام'],
  ];
  document.getElementById('stats-grid').innerHTML = cards.map(([c, n, l]) => `<div class="stat-card ${c}"><div class="num">${n}</div><div class="label">${l}</div></div>`).join('');
}

/* ---------------- المركبات ---------------- */
let routesCache = [], driversCache = [];
async function loadVehicles() {
  const [vehicles, routes, drivers] = await Promise.all([api('/vehicles'), api('/routes'), api('/drivers')]);
  routesCache = routes; driversCache = drivers;
  const el = document.getElementById('table-vehicles');
  if (!vehicles.length) { el.innerHTML = '<div class="empty">لا توجد حافلات مضافة بعد</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>الاسم</th><th>اللوحة</th><th>النوع</th><th>السعة</th><th>المسار</th><th>السائق</th><th>الحالة</th><th>الاتصال</th><th>مفتاح الجهاز</th><th></th></tr></thead><tbody>
    ${vehicles.map((v) => `<tr>
      <td>${v.name}</td><td>${v.plate_number || '—'}</td><td>${v.bus_type}</td><td>${v.seats}</td>
      <td>${v.route_name_ar || '—'}</td><td>${v.driver_name || '—'}</td>
      <td><span class="badge ${v.status === 'in_service' || v.status === 'approaching' || v.status === 'at_station' ? 'active' : v.status === 'emergency' ? 'inactive' : 'maintenance'}">${statusAr(v.status)}</span></td>
      <td><span class="badge ${v.connectivity}">${v.connectivity === 'online' ? 'متصل' : 'غير متصل'}</span></td>
      <td style="direction:ltr; font-family:monospace; font-size:12px">${v.device_key}</td>
      <td>${canEdit ? `<button class="btn-ghost" onclick="editVehicle(${v.id})">تعديل</button><button class="btn-danger" onclick="deleteVehicle(${v.id})">حذف</button>` : ''}</td>
    </tr>`).join('')}</tbody></table>`;
}
function statusAr(s) { return { in_service: 'في الخدمة', approaching: 'تقترب', at_station: 'عند المحطة', delayed: 'متأخرة', out_of_service: 'خارج الخدمة', emergency: 'طارئة' }[s] || s; }

function vehicleFormHtml(v = {}) {
  const routeOptions = routesCache.map((r) => `<option value="${r.id}" ${v.route_id === r.id ? 'selected' : ''}>${r.name_ar}</option>`).join('');
  const driverOptions = driversCache.map((d) => `<option value="${d.id}" ${v.driver_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('');
  return `<form id="vehicle-form"><div class="form-grid">
    <div><label>اسم الحافلة</label><input name="name" value="${v.name || ''}" required /></div>
    <div><label>رقم اللوحة</label><input name="plate_number" value="${v.plate_number || ''}" /></div>
    <div><label>نوع الحافلة</label><input name="bus_type" value="${v.bus_type || 'standard'}" /></div>
    <div><label>عدد المقاعد</label><input name="seats" type="number" value="${v.seats || 40}" /></div>
    <div><label>رابط صورة الحافلة (اختياري)</label><input name="photo_url" value="${v.photo_url || ''}" /></div>
    <div><label>المسار</label><select name="route_id"><option value="">— بدون —</option>${routeOptions}</select></div>
    <div><label>السائق</label><select name="driver_id"><option value="">— بدون —</option>${driverOptions}</select></div>
    ${v.id ? `<div><label>حالة المركبة</label><select name="vehicle_status">
        <option value="active" ${v.vehicle_status === 'active' ? 'selected' : ''}>نشطة</option>
        <option value="maintenance" ${v.vehicle_status === 'maintenance' ? 'selected' : ''}>صيانة</option>
        <option value="inactive" ${v.vehicle_status === 'inactive' ? 'selected' : ''}>متوقفة</option>
      </select></div>` : `<div><label>مفتاح جهاز GPS (فريد)</label><input name="device_key" placeholder="DEVICE-KEY-BUS-11" required /></div>`}
  </div><div class="form-actions"><button type="submit">${v.id ? 'حفظ التعديلات' : 'إضافة الحافلة'}</button><button type="button" onclick="closeForm('vehicle')">إلغاء</button></div></form>`;
}
document.getElementById('btn-add-vehicle').addEventListener('click', async () => {
  await ensureCaches();
  const panel = document.getElementById('form-vehicle');
  panel.innerHTML = vehicleFormHtml(); panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', submitVehicle);
});
async function ensureCaches() { routesCache = await api('/routes'); driversCache = await api('/drivers'); }
window.editVehicle = async (id) => {
  await ensureCaches();
  const v = (await api('/vehicles')).find((x) => x.id === id);
  const panel = document.getElementById('form-vehicle');
  panel.innerHTML = vehicleFormHtml(v); panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitVehicle(e, id));
};
async function submitVehicle(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (id) await api('/vehicles/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/vehicles', { method: 'POST', body: JSON.stringify(body) });
    closeForm('vehicle'); loadVehicles();
  } catch (err) { alert(err.message); }
}
window.deleteVehicle = async (id) => { if (!confirm('حذف هذه الحافلة نهائيًا؟')) return; await api('/vehicles/' + id, { method: 'DELETE' }); loadVehicles(); };

/* ---------------- المحطات ---------------- */
async function loadStations() {
  const stations = await api('/stations');
  const el = document.getElementById('table-stations');
  if (!stations.length) { el.innerHTML = '<div class="empty">لا توجد محطات بعد</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>الرمز</th><th>الاسم (عربي)</th><th>الاسم (إنجليزي)</th><th>خط العرض</th><th>خط الطول</th><th></th></tr></thead><tbody>
    ${stations.map((s) => `<tr><td>${s.code || '—'}</td><td>${s.name_ar}</td><td>${s.name_en}</td><td>${s.lat}</td><td>${s.lng}</td>
      <td>${canEdit ? `<button class="btn-danger" onclick="deleteStation(${s.id})">حذف</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
}
document.getElementById('btn-add-station').addEventListener('click', () => {
  const panel = document.getElementById('form-station');
  panel.innerHTML = `<form id="station-form"><div class="form-grid">
    <div><label>الرمز</label><input name="code" placeholder="S13" /></div>
    <div><label>الاسم بالعربية</label><input name="name_ar" required /></div>
    <div><label>الاسم بالإنجليزية</label><input name="name_en" required /></div>
    <div><label>خط العرض (Latitude)</label><input name="lat" type="number" step="0.000001" required /></div>
    <div><label>خط الطول (Longitude)</label><input name="lng" type="number" step="0.000001" required /></div>
  </div><div class="form-actions"><button type="submit">إضافة المحطة</button><button type="button" onclick="closeForm('station')">إلغاء</button></div></form>`;
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try { await api('/stations', { method: 'POST', body: JSON.stringify(body) }); closeForm('station'); loadStations(); }
    catch (err) { alert(err.message); }
  });
});
window.deleteStation = async (id) => { if (!confirm('حذف هذه المحطة؟ سيتم إزالتها من كل المسارات.')) return; await api('/stations/' + id, { method: 'DELETE' }); loadStations(); };

/* ---------------- المسارات ---------------- */
let stationsMasterCache = [];
async function loadRoutes() {
  const [routes, stations] = await Promise.all([api('/routes'), api('/stations')]);
  routesCache = routes; stationsMasterCache = stations;
  const el = document.getElementById('routes-list');
  if (!routes.length) { el.innerHTML = '<div class="empty">لا توجد مسارات بعد</div>'; return; }
   el.innerHTML = routes.map((r) => `<div class="route-card">
      <div class="route-title"><strong style="color:${r.color}">● ${r.name_ar} / ${r.name_en}</strong>
        ${canEdit ? `<div><button class="btn-ghost" onclick="editRoute(${r.id})">✏️ تعديل</button><button class="btn-ghost" onclick="addStationToRoute(${r.id})">+ إضافة محطة</button><button class="btn-ghost" onclick="window.location.href='route-editor.html?route=${r.id}'">🖊️ رسم يدوي</button><button class="btn-danger" onclick="deleteRoute(${r.id})">حذف المسار</button></div>` : ''}</div>
      <table><thead><tr><th>#</th><th>المحطة</th><th></th></tr></thead><tbody>
        ${r.stations.map((s) => `<tr><td>${s.sequence}</td><td>${s.name_ar} / ${s.name_en}</td>
          <td>${canEdit ? `<button class="btn-danger" onclick="removeStationFromRoute(${r.id}, ${s.id})">إزالة</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">لا توجد محطات في هذا المسار</td></tr>'}
      </tbody></table></div>`).join('');
}
function routeFormHtml(r = {}) {
  return `<form id="route-form"><div class="form-grid">
    <div><label>الاسم بالعربية</label><input name="name_ar" value="${r.name_ar || ''}" required /></div>
    <div><label>الاسم بالإنجليزية</label><input name="name_en" value="${r.name_en || ''}" required /></div>
    <div><label>اللون</label><input name="color" type="color" value="${r.color || '#2563eb'}" /></div>
    <div><label>وقت البدء</label><input name="start_time" type="time" value="${r.start_time || '07:00'}" /></div>
    <div><label>وقت الانتهاء</label><input name="end_time" type="time" value="${r.end_time || '22:00'}" /></div>
    ${r.id ? `<div><label>الحالة</label><select name="status">
        <option value="active" ${r.status === 'active' ? 'selected' : ''}>نشط</option>
        <option value="inactive" ${r.status === 'inactive' ? 'selected' : ''}>موقوف</option>
      </select></div>` : ''}
  </div><div class="form-actions"><button type="submit">${r.id ? 'حفظ التعديلات' : 'إضافة المسار'}</button><button type="button" onclick="closeForm('route')">إلغاء</button></div></form>`;
}

document.getElementById('btn-add-route').addEventListener('click', () => {
  const panel = document.getElementById('form-route');
  panel.innerHTML = routeFormHtml();
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitRoute(e));
});

window.editRoute = (id) => {
  const route = routesCache.find((r) => r.id === id);
  if (!route) return;
  const panel = document.getElementById('form-route');
  panel.innerHTML = routeFormHtml(route);
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitRoute(e, id));
};

async function submitRoute(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (id) await api('/routes/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/routes', { method: 'POST', body: JSON.stringify(body) });
    closeForm('route'); loadRoutes();
  } catch (err) { alert(err.message); }
}
window.addStationToRoute = async (routeId) => {
  if (!stationsMasterCache.length) stationsMasterCache = await api('/stations');
  const names = stationsMasterCache.map((s, i) => `${i + 1}. ${s.name_ar} / ${s.name_en}`).join('\n');
  const choice = prompt('اختر رقم المحطة من القائمة:\n' + names);
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || !stationsMasterCache[idx]) return;
  const sequence = prompt('ترتيب المحطة في المسار:', '1');
  try { await api(`/routes/${routeId}/stations`, { method: 'POST', body: JSON.stringify({ station_id: stationsMasterCache[idx].id, sequence: parseInt(sequence) || 1 }) }); loadRoutes(); }
  catch (err) { alert(err.message); }
};
window.removeStationFromRoute = async (routeId, stationId) => { await api(`/routes/${routeId}/stations/${stationId}`, { method: 'DELETE' }); loadRoutes(); };
window.deleteRoute = async (id) => { if (!confirm('حذف هذا المسار؟')) return; await api('/routes/' + id, { method: 'DELETE' }); loadRoutes(); };

/* ---------------- السائقون ---------------- */
async function loadDrivers() {
  const drivers = await api('/drivers'); driversCache = drivers;
  const el = document.getElementById('table-drivers');
  if (!drivers.length) { el.innerHTML = '<div class="empty">لا يوجد سائقون بعد</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>الاسم</th><th>الهاتف</th><th>رقم الرخصة</th><th>الحالة</th><th></th></tr></thead><tbody>
    ${drivers.map((d) => `<tr><td>${d.name}</td><td>${d.phone || '—'}</td><td>${d.license_number || '—'}</td>
      <td><span class="badge ${d.status === 'active' ? 'active' : 'inactive'}">${d.status === 'active' ? 'نشط' : 'موقوف'}</span></td>
      <td>${canEdit ? `<button class="btn-ghost" onclick="editDriver(${d.id})">تعديل</button><button class="btn-danger" onclick="deleteDriver(${d.id})">حذف</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
}
function driverFormHtml(d = {}) {
  return `<form id="driver-form"><div class="form-grid">
    <div><label>اسم السائق</label><input name="name" value="${d.name || ''}" required /></div>
    <div><label>رقم الهاتف</label><input name="phone" value="${d.phone || ''}" /></div>
    <div><label>رقم رخصة القيادة</label><input name="license_number" value="${d.license_number || ''}" /></div>
    ${d.id ? `<div><label>الحالة</label><select name="status">
        <option value="active" ${d.status === 'active' ? 'selected' : ''}>نشط</option>
        <option value="inactive" ${d.status === 'inactive' ? 'selected' : ''}>موقوف</option>
      </select></div>` : ''}
  </div><div class="form-actions"><button type="submit">${d.id ? 'حفظ التعديلات' : 'إضافة السائق'}</button><button type="button" onclick="closeForm('driver')">إلغاء</button></div></form>`;
}

document.getElementById('btn-add-driver').addEventListener('click', () => {
  const panel = document.getElementById('form-driver');
  panel.innerHTML = driverFormHtml();
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitDriver(e));
});

window.editDriver = (id) => {
  const driver = driversCache.find((d) => d.id === id);
  if (!driver) return;
  const panel = document.getElementById('form-driver');
  panel.innerHTML = driverFormHtml(driver);
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitDriver(e, id));
};

async function submitDriver(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (id) await api('/drivers/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/drivers', { method: 'POST', body: JSON.stringify(body) });
    closeForm('driver'); loadDrivers();
  } catch (err) { alert(err.message); }
}
window.deleteDriver = async (id) => { if (!confirm('حذف هذا السائق؟')) return; await api('/drivers/' + id, { method: 'DELETE' }); loadDrivers(); };

/* ---------------- التنبيهات ---------------- */
async function loadAlerts() {
  const alerts = await api('/alerts');
  const el = document.getElementById('table-alerts');
  if (!alerts.length) { el.innerHTML = '<div class="empty">لا توجد تنبيهات</div>'; return; }
  el.innerHTML = `<table><thead><tr><th>الحافلة</th><th>النوع</th><th>الرسالة</th><th>الخطورة</th><th>الوقت</th><th></th></tr></thead><tbody>
    ${alerts.map((a) => `<tr>
      <td>${a.bus_name || '—'}</td><td>${a.type}</td><td>${a.message}</td>
      <td><span class="severity-badge ${a.severity}">${a.severity}</span></td>
      <td>${new Date(a.created_at).toLocaleString('ar-EG')}</td>
      <td>${a.resolved ? '✅ معالج' : (canEdit ? `<button class="btn-ghost" onclick="resolveAlert(${a.id})">تمييز كمعالج</button>` : '⏳')}</td>
    </tr>`).join('')}</tbody></table>`;
}
window.resolveAlert = async (id) => { await api(`/alerts/${id}/resolve`, { method: 'PUT' }); loadAlerts(); };

/* ---------------- الإعلانات ---------------- */
async function loadAnnouncements() {
  const rows = await api('/announcements');
  const el = document.getElementById('table-announcements');
  el.innerHTML = rows.length ? `<table><thead><tr><th>عربي</th><th>إنجليزي</th><th>النطاق</th><th>الإنشاء</th><th></th></tr></thead><tbody>
    ${rows.map((a) => `<tr><td>${a.message_ar}</td><td>${a.message_en}</td><td>${a.station_scope === 'all' ? 'كل المحطات' : a.station_scope}</td>
      <td>${new Date(a.created_at).toLocaleString('ar-EG')}</td>
      <td>${canEdit ? `<button class="btn-danger" onclick="deleteAnnouncement(${a.id})">حذف</button>` : ''}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">لا توجد إعلانات</div>';
}
document.getElementById('btn-add-announcement').addEventListener('click', () => {
  const panel = document.getElementById('form-announcement');
  panel.innerHTML = `<form id="announcement-form"><div class="form-grid">
    <div><label>النص بالعربية</label><input name="message_ar" required /></div>
    <div><label>النص بالإنجليزية</label><input name="message_en" required /></div>
    <div><label>ينتهي بعد (دقائق، اتركه فارغًا لعدم الانتهاء)</label><input name="expires_in_minutes" type="number" /></div>
  </div><div class="form-actions"><button type="submit">نشر الإعلان</button><button type="button" onclick="closeForm('announcement')">إلغاء</button></div></form>`;
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try { await api('/announcements', { method: 'POST', body: JSON.stringify(body) }); closeForm('announcement'); loadAnnouncements(); }
    catch (err) { alert(err.message); }
  });
});
window.deleteAnnouncement = async (id) => { await api('/announcements/' + id, { method: 'DELETE' }); loadAnnouncements(); };

/* ---------------- البلاغات ---------------- */
const INCIDENT_LABELS = { breakdown: 'عطل', congestion: 'ازدحام', accident: 'حادث', emergency: 'طارئ' };
async function loadIncidents() {
  const rows = await api('/incidents');
  const el = document.getElementById('table-incidents');
  el.innerHTML = rows.length ? `<table><thead><tr><th>الحافلة</th><th>السائق</th><th>النوع</th><th>الملاحظات</th><th>الوقت</th><th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r.bus_name || '—'}</td><td>${r.driver_name || '—'}</td><td>${INCIDENT_LABELS[r.type] || r.type}</td>
      <td>${r.note || '—'}</td><td>${new Date(r.created_at).toLocaleString('ar-EG')}</td>
      <td>${r.resolved ? '✅' : (canEdit ? `<button class="btn-ghost" onclick="resolveIncident(${r.id})">معالجة</button>` : '⏳')}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">لا توجد بلاغات</div>';
}
window.resolveIncident = async (id) => { await api(`/incidents/${id}/resolve`, { method: 'PUT' }); loadIncidents(); };

/* ---------------- المستخدمون ---------------- */
async function loadUsers() {
  if (currentUser.role !== 'super_admin') return;
  const users = await api('/users');
  document.getElementById('table-users').innerHTML = `<table><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${ROLE_LABELS[u.role] || u.role}</td>
      <td>${u.id !== currentUser.id ? `<button class="btn-danger" onclick="deleteUser(${u.id})">حذف</button>` : '<span style="color:#94a3b8;font-size:12px">حسابك</span>'}</td></tr>`).join('')}</tbody></table>`;
}
document.getElementById('btn-add-user').addEventListener('click', () => {
  const panel = document.getElementById('form-user');
  panel.innerHTML = `<form id="user-form"><div class="form-grid">
    <div><label>الاسم</label><input name="name" required /></div>
    <div><label>البريد الإلكتروني</label><input name="email" type="email" required /></div>
    <div><label>كلمة المرور</label><input name="password" type="password" required /></div>
    <div><label>الدور</label><select name="role">
      <option value="viewer">مشاهدة فقط</option><option value="dispatcher">موظف تشغيل</option>
      <option value="transport_manager">مدير النقل</option><option value="super_admin">مدير عام</option>
      <option value="driver">سائق</option></select></div>
  </div><div class="form-actions"><button type="submit">إضافة المستخدم</button><button type="button" onclick="closeForm('user')">إلغاء</button></div></form>`;
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.target).entries());
    try { await api('/users', { method: 'POST', body: JSON.stringify(body) }); closeForm('user'); loadUsers(); }
    catch (err) { alert(err.message); }
  });
});
window.deleteUser = async (id) => { if (!confirm('حذف هذا المستخدم؟')) return; try { await api('/users/' + id, { method: 'DELETE' }); loadUsers(); } catch (err) { alert(err.message); } };

/* ---------------- سجل التدقيق ---------------- */
async function loadAudit() {
  if (currentUser.role !== 'super_admin') return;
  const rows = await api('/audit-logs');
  document.getElementById('table-audit').innerHTML = `<table><thead><tr><th>المستخدم</th><th>الإجراء</th><th>العنصر</th><th>الوقت</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r.user_name}</td><td>${r.action}</td><td>${r.entity || '—'} ${r.entity_id ? '#' + r.entity_id : ''}</td><td>${new Date(r.created_at).toLocaleString('ar-EG')}</td></tr>`).join('')}</tbody></table>`;
}

/* ---------------- التقارير ---------------- */
async function loadReports() {
  const [summary, arrivals] = await Promise.all([api('/reports/summary'), api('/reports/arrivals')]);
  document.getElementById('export-csv').href = '/api/admin/reports/arrivals.csv?token=' + token;
  document.getElementById('export-csv').onclick = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/reports/arrivals.csv', { headers: { Authorization: 'Bearer ' + token } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'arrivals-report.csv'; a.click();
  };
  document.getElementById('table-summary').innerHTML = `<table><thead><tr><th>الحافلة</th><th>اللوحة</th><th>الوصولات (اليوم)</th><th>الوصولات (7 أيام)</th></tr></thead><tbody>
    ${summary.map((s) => `<tr><td>${s.bus_name}</td><td>${s.plate_number || '—'}</td><td>${s.arrivals_today}</td><td>${s.arrivals_count}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('table-arrivals').innerHTML = arrivals.length ? `<table><thead><tr><th>الحافلة</th><th>اللوحة</th><th>المسار</th><th>المحطة</th><th>الوقت</th></tr></thead><tbody>
    ${arrivals.slice(0, 100).map((a) => `<tr><td>${a.bus_name}</td><td>${a.plate_number || '—'}</td><td>${a.route_ar || '—'}</td><td>${a.station_ar}</td><td>${new Date(a.arrived_at).toLocaleString('ar-EG')}</td></tr>`).join('')}</tbody></table>` : '<div class="empty">لا يوجد سجل بعد</div>';
}

loadOverview();
