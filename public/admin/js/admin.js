// admin.js — منطق لوحة الإدارة الكامل مع دعم اللغتين

applyLang();
document.getElementById('lang-toggle').addEventListener('click', () => setLang(getLang() === 'ar' ? 'en' : 'ar'));
document.addEventListener('langchange', () => {
  document.getElementById('user-role').textContent = t().admin.roleLabels[currentUser.role] || currentUser.role;
  loadTab(currentTab);
});

const token = localStorage.getItem('bus_admin_token');
const currentUser = JSON.parse(localStorage.getItem('bus_admin_user') || 'null');
if (!token || !currentUser) window.location.href = '/admin/login.html';

document.getElementById('user-name').textContent = currentUser.name;
document.getElementById('user-role').textContent = t().admin.roleLabels[currentUser.role] || currentUser.role;
if (currentUser.role !== 'super_admin') { document.getElementById('nav-users').style.display = 'none'; document.getElementById('nav-audit').style.display = 'none'; }

document.getElementById('logout-btn').addEventListener('click', () => {
  localStorage.removeItem('bus_admin_token'); localStorage.removeItem('bus_admin_user');
  window.location.href = '/admin/login.html';
});

document.getElementById('change-pw-btn').addEventListener('click', async () => {
  const currentPassword = prompt(getLang() === 'ar' ? 'كلمة المرور الحالية:' : 'Current password:');
  if (!currentPassword) return;
  const newPassword = prompt(getLang() === 'ar' ? 'كلمة المرور الجديدة (8 أحرف على الأقل):' : 'New password (min 8 characters):');
  if (!newPassword) return;
  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    alert(getLang() === 'ar' ? 'تم تغيير كلمة المرور بنجاح' : 'Password changed successfully');
  } catch (e) { alert(e.message); }
});

const canEdit = ['super_admin', 'transport_manager', 'dispatcher'].includes(currentUser.role);

async function api(path, opts = {}) {
  const res = await fetch('/api/admin' + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token, ...(opts.headers || {}) } });
  if (res.status === 401) { localStorage.removeItem('bus_admin_token'); window.location.href = '/admin/login.html'; return; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

/* ---------------- التبويبات ---------------- */
let currentTab = 'overview';
document.querySelectorAll('.nav-item').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((tb) => tb.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    currentTab = btn.dataset.tab;
    loadTab(currentTab);
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
  const a = t().admin.overview;
  const cards = [
    ['blue', s.total, a.total], ['green', s.in_service, a.inService],
    ['amber', s.approaching, a.approaching], ['blue', s.at_station, a.atStation],
    ['red', s.delayed, a.delayed], ['red', s.emergency, a.emergency],
    ['amber', s.out_of_service, a.outOfService], ['red', s.offline, a.offline],
    ['green', s.activeTrips, a.activeTrips], ['blue', s.arrivalsLast7Days, a.arrivalsLast7],
  ];
  document.getElementById('stats-grid').innerHTML = cards.map(([c, n, l]) => `<div class="stat-card ${c}"><div class="num">${n}</div><div class="label">${l}</div></div>`).join('');
}

/* ---------------- المركبات ---------------- */
let routesCache = [], driversCache = [];
async function loadVehicles() {
  const [vehicles, routes, drivers] = await Promise.all([api('/vehicles'), api('/routes'), api('/drivers')]);
  routesCache = routes; driversCache = drivers;
  const a = t().admin.vehicles; const lang = getLang();
  const el = document.getElementById('table-vehicles');
  if (!vehicles.length) { el.innerHTML = `<div class="empty">${a.empty}</div>`; return; }
  el.innerHTML = `<table><thead><tr><th>${a.name}</th><th>${a.plate}</th><th>${a.type}</th><th>${a.seats}</th><th>${a.route}</th><th>${a.driver}</th><th>${a.status}</th><th>${a.connectivity}</th><th>${a.deviceKey}</th><th></th></tr></thead><tbody>
    ${vehicles.map((v) => {
      const routeName = lang === 'ar' ? v.route_name_ar : v.route_name_en;
      return `<tr>
      <td>${v.name}</td><td>${v.plate_number || '—'}</td><td>${v.bus_type}</td><td>${v.seats}</td>
      <td>${routeName || '—'}</td><td>${v.driver_name || '—'}</td>
      <td><span class="badge ${v.status === 'in_service' || v.status === 'approaching' || v.status === 'at_station' ? 'active' : v.status === 'emergency' ? 'inactive' : 'maintenance'}">${statusLabel(v.status)}</span></td>
      <td><span class="badge ${v.connectivity}">${v.connectivity === 'online' ? a.online : a.offlineStatus}</span></td>
      <td style="direction:ltr; font-family:monospace; font-size:12px">${v.device_key}</td>
      <td>${canEdit ? `<button class="btn-ghost" onclick="editVehicle(${v.id})">${t().admin.common.edit}</button><button class="btn-danger" onclick="deleteVehicle(${v.id})">${t().admin.common.delete}</button>` : ''}</td>
    </tr>`; }).join('')}</tbody></table>`;
}
function statusLabel(s) {
  const a = t().admin.vehicles;
  return { in_service: a.busStatusActive, approaching: t().status.approaching, at_station: t().status.at_station, delayed: t().status.delayed, out_of_service: a.busStatusMaintenance, emergency: a.busStatusEmergency }[s] || s;
}

function vehicleFormHtml(v = {}) {
  const a = t().admin.vehicles; const lang = getLang();
  const routeOptions = routesCache.map((r) => `<option value="${r.id}" ${v.route_id === r.id ? 'selected' : ''}>${lang === 'ar' ? r.name_ar : r.name_en}</option>`).join('');
  const driverOptions = driversCache.map((d) => `<option value="${d.id}" ${v.driver_id === d.id ? 'selected' : ''}>${d.name}</option>`).join('');
  return `<form id="vehicle-form"><div class="form-grid">
    <div><label>${a.formName}</label><input name="name" value="${v.name || ''}" required /></div>
    <div><label>${a.formPlate}</label><input name="plate_number" value="${v.plate_number || ''}" /></div>
    <div><label>${a.formType}</label><input name="bus_type" value="${v.bus_type || 'standard'}" /></div>
    <div><label>${a.formSeats}</label><input name="seats" type="number" value="${v.seats || 40}" /></div>
    <div><label>${a.formPhoto}</label><input name="photo_url" value="${v.photo_url || ''}" /></div>
    <div><label>${a.formRoute}</label><select name="route_id"><option value="">${t().admin.common.none}</option>${routeOptions}</select></div>
    <div><label>${a.formDriver}</label><select name="driver_id"><option value="">${t().admin.common.none}</option>${driverOptions}</select></div>
    ${v.id ? `<div><label>${a.formStatus}</label><select name="vehicle_status">
        <option value="active" ${v.vehicle_status === 'active' ? 'selected' : ''}>${a.statusActive}</option>
        <option value="maintenance" ${v.vehicle_status === 'maintenance' ? 'selected' : ''}>${a.statusMaintenance}</option>
        <option value="inactive" ${v.vehicle_status === 'inactive' ? 'selected' : ''}>${a.statusInactive}</option>
      </select></div>` : `<div><label>${a.formDeviceKey}</label><input name="device_key" placeholder="DEVICE-KEY-BUS-11" required /></div>`}
  </div><div class="form-actions"><button type="submit">${v.id ? a.editTitle : a.addTitle}</button><button type="button" onclick="closeForm('vehicle')">${t().admin.common.cancel}</button></div></form>`;
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
window.deleteVehicle = async (id) => { if (!confirm(t().admin.common.confirmDelete)) return; await api('/vehicles/' + id, { method: 'DELETE' }); loadVehicles(); };

/* ---------------- المحطات ---------------- */
async function loadStations() {
  const stations = await api('/stations');
  stationsCache = stations;
  const a = t().admin.stations;
  const el = document.getElementById('table-stations');
  if (!stations.length) { el.innerHTML = `<div class="empty">${a.empty}</div>`; return; }
  el.innerHTML = `<table><thead><tr><th>${a.code}</th><th>${a.nameAr}</th><th>${a.nameEn}</th><th>${a.lat}</th><th>${a.lng}</th><th></th></tr></thead><tbody>
    ${stations.map((s) => `<tr><td>${s.code || '—'}</td><td>${s.name_ar}</td><td>${s.name_en}</td><td>${s.lat}</td><td>${s.lng}</td>
      <td>${canEdit ? `<button class="btn-ghost" onclick="editStation(${s.id})">${t().admin.common.edit}</button><button class="btn-danger" onclick="deleteStation(${s.id})">${t().admin.common.delete}</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
}
let stationsCache = [];
function stationFormHtml(s = {}) {
  const a = t().admin.stations;
  return `<form id="station-form"><div class="form-grid">
    <div><label>${a.formCode}</label><input name="code" value="${s.code || ''}" placeholder="S13" /></div>
    <div><label>${a.formNameAr}</label><input name="name_ar" value="${s.name_ar || ''}" required /></div>
    <div><label>${a.formNameEn}</label><input name="name_en" value="${s.name_en || ''}" required /></div>
    <div><label>${a.formLat}</label><input name="lat" type="number" step="0.000001" value="${s.lat || ''}" required /></div>
    <div><label>${a.formLng}</label><input name="lng" type="number" step="0.000001" value="${s.lng || ''}" required /></div>
    ${s.id ? `<div><label>${a.formStatus}</label><select name="status">
        <option value="active" ${s.status === 'active' ? 'selected' : ''}>${a.statusActive}</option>
        <option value="inactive" ${s.status === 'inactive' ? 'selected' : ''}>${a.statusInactive}</option>
      </select></div>` : ''}
  </div><div class="form-actions"><button type="submit">${s.id ? t().admin.vehicles.editTitle : a.addTitle}</button><button type="button" onclick="closeForm('station')">${t().admin.common.cancel}</button></div></form>`;
}
document.getElementById('btn-add-station').addEventListener('click', () => {
  const panel = document.getElementById('form-station');
  panel.innerHTML = stationFormHtml();
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitStation(e));
});
window.editStation = (id) => {
  const station = stationsCache.find((s) => s.id === id);
  if (!station) return;
  const panel = document.getElementById('form-station');
  panel.innerHTML = stationFormHtml(station);
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitStation(e, id));
};
async function submitStation(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  try {
    if (id) await api('/stations/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/stations', { method: 'POST', body: JSON.stringify(body) });
    closeForm('station'); loadStations();
  } catch (err) { alert(err.message); }
}
window.deleteStation = async (id) => { if (!confirm(t().admin.common.confirmDelete)) return; await api('/stations/' + id, { method: 'DELETE' }); loadStations(); };

/* ---------------- المسارات ---------------- */
let stationsMasterCache = [];
async function loadRoutes() {
  const routes = await api('/routes');
  routesCache = routes;
  const a = t().admin.routes; const lang = getLang();
  const el = document.getElementById('routes-list');
  if (!routes.length) { el.innerHTML = `<div class="empty">${a.empty}</div>`; return; }
  el.innerHTML = routes.map((r) => `<div class="route-card">
      <div class="route-title"><strong style="color:${r.color}">● ${lang === 'ar' ? r.name_ar : r.name_en}</strong>
        ${canEdit ? `<div><button class="btn-ghost" onclick="editRoute(${r.id})">${a.editBtn}</button><button class="btn-ghost" onclick="addStationToRoute(${r.id})">${a.addStation}</button><button class="btn-ghost" onclick="window.location.href='route-editor.html?route=${r.id}'">${a.manualDraw}</button><button class="btn-danger" onclick="deleteRoute(${r.id})">${a.deleteRoute}</button></div>` : ''}</div>
      <table><thead><tr><th>${a.sequence}</th><th>${a.station}</th><th></th></tr></thead><tbody>
        ${r.stations.map((s) => `<tr><td>${s.sequence}</td><td>${lang === 'ar' ? s.name_ar : s.name_en}</td>
          <td>${canEdit ? `<button class="btn-danger" onclick="removeStationFromRoute(${r.id}, ${s.id})">${a.remove}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="3" class="empty">${a.emptyStations}</td></tr>`}
      </tbody></table></div>`).join('');
}
function routeFormHtml(r = {}) {
  const a = t().admin.routes;
  return `<form id="route-form"><div class="form-grid">
    <div><label>${a.formNameAr}</label><input name="name_ar" value="${r.name_ar || ''}" required /></div>
    <div><label>${a.formNameEn}</label><input name="name_en" value="${r.name_en || ''}" required /></div>
    <div><label>${a.formColor}</label><input name="color" type="color" value="${r.color || '#2563eb'}" /></div>
    <div><label>${a.formStart}</label><input name="start_time" type="time" value="${r.start_time || '07:00'}" /></div>
    <div><label>${a.formEnd}</label><input name="end_time" type="time" value="${r.end_time || '22:00'}" /></div>
    ${r.id ? `<div><label>${a.formStatus}</label><select name="status">
        <option value="active" ${r.status === 'active' ? 'selected' : ''}>${t().admin.common.active}</option>
        <option value="inactive" ${r.status === 'inactive' ? 'selected' : ''}>${t().admin.common.inactive}</option>
      </select></div>` : ''}
  </div><div class="form-actions"><button type="submit">${r.id ? t().admin.vehicles.editTitle : a.addTitle}</button><button type="button" onclick="closeForm('route')">${t().admin.common.cancel}</button></div></form>`;
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
  const lang = getLang();
  const names = stationsMasterCache.map((s, i) => `${i + 1}. ${lang === 'ar' ? s.name_ar : s.name_en}`).join('\n');
  const choice = prompt(t().admin.routes.promptStationList + '\n' + names);
  const idx = parseInt(choice) - 1;
  if (isNaN(idx) || !stationsMasterCache[idx]) return;
  const sequence = prompt(t().admin.routes.promptSequence, '1');
  try { await api(`/routes/${routeId}/stations`, { method: 'POST', body: JSON.stringify({ station_id: stationsMasterCache[idx].id, sequence: parseInt(sequence) || 1 }) }); loadRoutes(); }
  catch (err) { alert(err.message); }
};
window.removeStationFromRoute = async (routeId, stationId) => { await api(`/routes/${routeId}/stations/${stationId}`, { method: 'DELETE' }); loadRoutes(); };
window.deleteRoute = async (id) => { if (!confirm(t().admin.common.confirmDelete)) return; await api('/routes/' + id, { method: 'DELETE' }); loadRoutes(); };

/* ---------------- السائقون ---------------- */
async function loadDrivers() {
  const drivers = await api('/drivers'); driversCache = drivers;
  const a = t().admin.drivers;
  const el = document.getElementById('table-drivers');
  if (!drivers.length) { el.innerHTML = `<div class="empty">${a.empty}</div>`; return; }
  el.innerHTML = `<table><thead><tr><th>${t().admin.common.name}</th><th>${a.phone}</th><th>${a.license}</th><th>${a.status}</th><th></th></tr></thead><tbody>
    ${drivers.map((d) => `<tr><td>${d.name}</td><td>${d.phone || '—'}</td><td>${d.license_number || '—'}</td>
      <td><span class="badge ${d.status === 'active' ? 'active' : 'inactive'}">${d.status === 'active' ? a.statusActive : a.statusInactive}</span></td>
      <td>${canEdit ? `<button class="btn-ghost" onclick="editDriver(${d.id})">${t().admin.common.edit}</button><button class="btn-danger" onclick="deleteDriver(${d.id})">${t().admin.common.delete}</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
}
function driverFormHtml(d = {}) {
  const a = t().admin.drivers;
  return `<form id="driver-form"><div class="form-grid">
    <div><label>${a.formName}</label><input name="name" value="${d.name || ''}" required /></div>
    <div><label>${a.formPhone}</label><input name="phone" value="${d.phone || ''}" /></div>
    <div><label>${a.formLicense}</label><input name="license_number" value="${d.license_number || ''}" /></div>
    ${d.id ? `<div><label>${a.formStatus}</label><select name="status">
        <option value="active" ${d.status === 'active' ? 'selected' : ''}>${a.statusActive}</option>
        <option value="inactive" ${d.status === 'inactive' ? 'selected' : ''}>${a.statusInactive}</option>
      </select></div>` : ''}
  </div><div class="form-actions"><button type="submit">${d.id ? t().admin.vehicles.editTitle : a.addTitle}</button><button type="button" onclick="closeForm('driver')">${t().admin.common.cancel}</button></div></form>`;
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
window.deleteDriver = async (id) => { if (!confirm(t().admin.common.confirmDelete)) return; await api('/drivers/' + id, { method: 'DELETE' }); loadDrivers(); };

/* ---------------- التنبيهات ---------------- */
async function loadAlerts() {
  const alerts = await api('/alerts');
  const a = t().admin.alerts;
  const el = document.getElementById('table-alerts');
  if (!alerts.length) { el.innerHTML = `<div class="empty">${a.empty}</div>`; return; }
  el.innerHTML = `<table><thead><tr><th>${a.bus}</th><th>${a.type}</th><th>${a.message}</th><th>${a.severity}</th><th>${a.time}</th><th></th></tr></thead><tbody>
    ${alerts.map((al) => `<tr>
      <td>${al.bus_name || '—'}</td><td>${al.type}</td><td>${al.message}</td>
      <td><span class="severity-badge ${al.severity}">${al.severity}</span></td>
      <td>${new Date(al.created_at).toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-GB')}</td>
      <td>${al.resolved ? a.resolved : (canEdit ? `<button class="btn-ghost" onclick="resolveAlert(${al.id})">${a.resolve}</button>` : a.pending)}</td>
    </tr>`).join('')}</tbody></table>`;
}
window.resolveAlert = async (id) => { await api(`/alerts/${id}/resolve`, { method: 'PUT' }); loadAlerts(); };

/* ---------------- الإعلانات ---------------- */
async function loadAnnouncements() {
  const rows = await api('/announcements');
  const a = t().admin.announcements;
  const el = document.getElementById('table-announcements');
  el.innerHTML = rows.length ? `<table><thead><tr><th>${a.ar}</th><th>${a.en}</th><th>${a.scope}</th><th>${a.created}</th><th></th></tr></thead><tbody>
    ${rows.map((an) => `<tr><td>${an.message_ar}</td><td>${an.message_en}</td><td>${an.station_scope === 'all' ? a.allStations : an.station_scope}</td>
      <td>${new Date(an.created_at).toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-GB')}</td>
      <td>${canEdit ? `<button class="btn-danger" onclick="deleteAnnouncement(${an.id})">${t().admin.common.delete}</button>` : ''}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">${a.empty}</div>`;
}
document.getElementById('btn-add-announcement').addEventListener('click', () => {
  const a = t().admin.announcements;
  const panel = document.getElementById('form-announcement');
  panel.innerHTML = `<form id="announcement-form"><div class="form-grid">
    <div><label>${a.formMessageAr}</label><input name="message_ar" required /></div>
    <div><label>${a.formMessageEn}</label><input name="message_en" required /></div>
    <div><label>${a.formExpires}</label><input name="expires_in_minutes" type="number" /></div>
  </div><div class="form-actions"><button type="submit">${a.addTitle}</button><button type="button" onclick="closeForm('announcement')">${t().admin.common.cancel}</button></div></form>`;
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
async function loadIncidents() {
  const rows = await api('/incidents');
  const a = t().admin.incidents;
  const el = document.getElementById('table-incidents');
  el.innerHTML = rows.length ? `<table><thead><tr><th>${a.bus}</th><th>${a.driver}</th><th>${a.type}</th><th>${a.notes}</th><th>${a.time}</th><th></th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r.bus_name || '—'}</td><td>${r.driver_name || '—'}</td><td>${a.types[r.type] || r.type}</td>
      <td>${r.note || '—'}</td><td>${new Date(r.created_at).toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-GB')}</td>
      <td>${r.resolved ? '✅' : (canEdit ? `<button class="btn-ghost" onclick="resolveIncident(${r.id})">${a.resolve}</button>` : '⏳')}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">${a.empty}</div>`;
}
window.resolveIncident = async (id) => { await api(`/incidents/${id}/resolve`, { method: 'PUT' }); loadIncidents(); };

/* ---------------- المستخدمون ---------------- */
let usersCache = [];
async function loadUsers() {
  if (currentUser.role !== 'super_admin') return;
  const users = await api('/users');
  usersCache = users;
  const a = t().admin.users;
  document.getElementById('table-users').innerHTML = `<table><thead><tr><th>${a.name}</th><th>${a.email}</th><th>${a.role}</th><th></th></tr></thead><tbody>
    ${users.map((u) => `<tr><td>${u.name}</td><td>${u.email}</td><td>${t().admin.roleLabels[u.role] || u.role}</td>
      <td><button class="btn-ghost" onclick="editUser(${u.id})">${t().admin.common.edit}</button>${u.id !== currentUser.id ? `<button class="btn-danger" onclick="deleteUser(${u.id})">${t().admin.common.delete}</button>` : `<span style="color:#94a3b8;font-size:12px">${t().admin.common.yourAccount}</span>`}</td></tr>`).join('')}</tbody></table>`;
}
function userFormHtml(u = {}) {
  const a = t().admin.users; const rl = t().admin.roleLabels;
  const roleOption = (value) => `<option value="${value}" ${u.role === value ? 'selected' : ''}>${rl[value]}</option>`;
  return `<form id="user-form"><div class="form-grid">
    <div><label>${a.formName}</label><input name="name" value="${u.name || ''}" required /></div>
    <div><label>${a.formEmail}</label><input name="email" type="email" value="${u.email || ''}" ${u.id ? 'readonly' : 'required'} /></div>
    <div><label>${u.id ? a.formPasswordEdit : a.formPassword}</label><input name="password" type="password" ${u.id ? '' : 'required'} /></div>
    <div><label>${a.formRole}</label><select name="role">
      ${roleOption('viewer')}${roleOption('dispatcher')}${roleOption('transport_manager')}${roleOption('super_admin')}${roleOption('driver')}</select></div>
  </div><div class="form-actions"><button type="submit">${u.id ? t().admin.vehicles.editTitle : a.addTitle}</button><button type="button" onclick="closeForm('user')">${t().admin.common.cancel}</button></div></form>`;
}
document.getElementById('btn-add-user').addEventListener('click', () => {
  const panel = document.getElementById('form-user');
  panel.innerHTML = userFormHtml();
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitUser(e));
});
window.editUser = (id) => {
  const user = usersCache.find((u) => u.id === id);
  if (!user) return;
  const panel = document.getElementById('form-user');
  panel.innerHTML = userFormHtml(user);
  panel.classList.remove('hidden');
  panel.querySelector('form').addEventListener('submit', (e) => submitUser(e, id));
};
async function submitUser(e, id) {
  e.preventDefault();
  const body = Object.fromEntries(new FormData(e.target).entries());
  if (id && !body.password) delete body.password;
  try {
    if (id) await api('/users/' + id, { method: 'PUT', body: JSON.stringify(body) });
    else await api('/users', { method: 'POST', body: JSON.stringify(body) });
    closeForm('user'); loadUsers();
  } catch (err) { alert(err.message); }
}
window.deleteUser = async (id) => {
  if (!confirm(t().admin.common.confirmDelete)) return;
  try { await api('/users/' + id, { method: 'DELETE' }); loadUsers(); }
  catch (err) { alert(err.message); }
};

/* ---------------- سجل التدقيق ---------------- */
async function loadAudit() {
  if (currentUser.role !== 'super_admin') return;
  const rows = await api('/audit-logs');
  const a = t().admin.audit;
  document.getElementById('table-audit').innerHTML = `<table><thead><tr><th>${a.user}</th><th>${a.action}</th><th>${a.entity}</th><th>${a.time}</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${r.user_name}</td><td>${r.action}</td><td>${r.entity || '—'} ${r.entity_id ? '#' + r.entity_id : ''}</td><td>${new Date(r.created_at).toLocaleString(getLang() === 'ar' ? 'ar-EG' : 'en-GB')}</td></tr>`).join('')}</tbody></table>`;
}

/* ---------------- التقارير ---------------- */
async function loadReports() {
  const [summary, arrivals] = await Promise.all([api('/reports/summary'), api('/reports/arrivals')]);
  const a = t().admin.reports; const lang = getLang();
  document.getElementById('export-csv').onclick = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/admin/reports/arrivals.csv', { headers: { Authorization: 'Bearer ' + token } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'arrivals-report.csv'; link.click();
  };
  document.getElementById('table-summary').innerHTML = `<table><thead><tr><th>${a.bus}</th><th>${a.plate}</th><th>${a.arrivalsToday}</th><th>${a.arrivals7}</th></tr></thead><tbody>
    ${summary.map((s) => `<tr><td>${s.bus_name}</td><td>${s.plate_number || '—'}</td><td>${s.arrivals_today}</td><td>${s.arrivals_count}</td></tr>`).join('')}</tbody></table>`;
  document.getElementById('table-arrivals').innerHTML = arrivals.length ? `<table><thead><tr><th>${a.bus}</th><th>${a.plate}</th><th>${a.route}</th><th>${a.station}</th><th>${a.time}</th></tr></thead><tbody>
    ${arrivals.slice(0, 100).map((ar) => `<tr><td>${ar.bus_name}</td><td>${ar.plate_number || '—'}</td><td>${lang === 'ar' ? (ar.route_ar || '—') : (ar.route_en || '—')}</td><td>${lang === 'ar' ? ar.station_ar : ar.station_en}</td><td>${new Date(ar.arrived_at).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</td></tr>`).join('')}</tbody></table>` : `<div class="empty">${a.empty}</div>`;
}

/* ---------------- التشغيل الأولي ---------------- */
loadOverview();
