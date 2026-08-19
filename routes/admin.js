// routes/admin.js — كل عمليات الإدارة خلف تسجيل الدخول والأدوار
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');
const { fetchRoadGeometry } = require('../services/routing');
const router = express.Router();
router.use(requireAuth);

const canManage = requireRole('super_admin', 'transport_manager', 'dispatcher');
const canManageUsers = requireRole('super_admin');

async function recomputeRouteGeometry(routeId, force = false) {
  const route = db.prepare('SELECT geometry_source FROM routes WHERE id=?').get(routeId);
  if (!force && route && route.geometry_source === 'manual') {
    return true;
  }

  const stations = db.prepare(
    `SELECT s.lat, s.lng FROM route_stations rs JOIN stations s ON s.id = rs.station_id
     WHERE rs.route_id = ? ORDER BY rs.sequence ASC`
  ).all(routeId);

  const geometry = await fetchRoadGeometry(stations);
  db.prepare("UPDATE routes SET geometry = ?, geometry_source = 'osrm' WHERE id = ?")
    .run(geometry ? JSON.stringify(geometry) : null, routeId);
  return !!geometry;
}
/* ============================ إحصائيات لوحة القيادة ============================ */
router.get('/dashboard/stats', (req, res) => {
  const buses = db.prepare('SELECT * FROM buses').all();
  const stats = {
    total: buses.length,
    in_service: buses.filter((b) => b.status === 'in_service').length,
    approaching: buses.filter((b) => b.status === 'approaching').length,
    at_station: buses.filter((b) => b.status === 'at_station').length,
    delayed: buses.filter((b) => b.status === 'delayed').length,
    out_of_service: buses.filter((b) => b.status === 'out_of_service').length,
    emergency: buses.filter((b) => b.status === 'emergency').length,
    offline: buses.filter((b) => b.connectivity !== 'online').length,
    activeTrips: db.prepare("SELECT COUNT(*) c FROM trips WHERE status='active'").get().c,
  };
  const last7 = db.prepare("SELECT COUNT(*) c FROM arrivals WHERE arrived_at >= datetime('now','-7 days')").get().c;
  stats.arrivalsLast7Days = last7;
  res.json(stats);
});

/* ============================ المركبات ============================ */
router.get('/vehicles', (req, res) => {
  const rows = db.prepare(
    `SELECT b.*, r.name_ar as route_name_ar, r.name_en as route_name_en, d.name as driver_name
     FROM buses b LEFT JOIN routes r ON r.id=b.route_id LEFT JOIN drivers d ON d.id=b.driver_id
     ORDER BY b.id ASC`
  ).all();
  res.json(rows);
});

router.post('/vehicles', canManage, (req, res) => {
  const { name, plate_number, bus_type, seats, photo_url, route_id, driver_id, device_key } = req.body;
  if (!name || !device_key) return res.status(400).json({ error: 'اسم الحافلة ومفتاح الجهاز مطلوبان' });
  if (db.prepare('SELECT id FROM buses WHERE device_key=?').get(device_key)) {
    return res.status(409).json({ error: 'مفتاح الجهاز مستخدم بالفعل' });
  }
  const info = db.prepare(
    `INSERT INTO buses (name, plate_number, bus_type, seats, photo_url, route_id, driver_id, device_key)
     VALUES (?,?,?,?,?,?,?,?)`
  ).run(name, plate_number || null, bus_type || 'standard', seats || 40, photo_url || null, route_id || null, driver_id || null, device_key);
  logAction(req.user, 'create', 'bus', info.lastInsertRowid, { name });
  res.json({ id: info.lastInsertRowid });
});

router.put('/vehicles/:id', canManage, (req, res) => {
  const { name, plate_number, bus_type, seats, photo_url, route_id, driver_id, vehicle_status } = req.body;
  db.prepare(
    `UPDATE buses SET name=?, plate_number=?, bus_type=?, seats=?, photo_url=?, route_id=?, driver_id=?, vehicle_status=? WHERE id=?`
  ).run(name, plate_number || null, bus_type || 'standard', seats || 40, photo_url || null, route_id || null, driver_id || null, vehicle_status || 'active', req.params.id);
  logAction(req.user, 'update', 'bus', req.params.id, req.body);
  res.json({ ok: true });
});

router.put('/vehicles/:id/status', canManage, (req, res) => {
  const { status } = req.body;
  const valid = ['in_service', 'out_of_service', 'emergency'];
  if (!valid.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });
  const override = status === 'in_service' ? 0 : 1;
  db.prepare('UPDATE buses SET status=?, status_override=? WHERE id=?').run(status, override, req.params.id);
  logAction(req.user, 'status_change', 'bus', req.params.id, { status });
  res.json({ ok: true });
});

router.delete('/vehicles/:id', canManage, (req, res) => {
  db.prepare('DELETE FROM gps_history WHERE bus_id=?').run(req.params.id);
  db.prepare('DELETE FROM arrivals WHERE bus_id=?').run(req.params.id);
  db.prepare('DELETE FROM alerts WHERE bus_id=?').run(req.params.id);
  db.prepare('DELETE FROM buses WHERE id=?').run(req.params.id);
  logAction(req.user, 'delete', 'bus', req.params.id);
  res.json({ ok: true });
});

/* ============================ المحطات (القائمة الرئيسية) ============================ */
router.get('/stations', (req, res) => res.json(db.prepare('SELECT * FROM stations ORDER BY id ASC').all()));

router.post('/stations', canManage, (req, res) => {
  const { code, name_ar, name_en, lat, lng } = req.body;
  if (!name_ar || !name_en || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'الاسم بالعربية والإنجليزية والإحداثيات مطلوبة' });
  }
  const info = db.prepare('INSERT INTO stations (code, name_ar, name_en, lat, lng) VALUES (?,?,?,?,?)')
    .run(code || null, name_ar, name_en, lat, lng);
  logAction(req.user, 'create', 'station', info.lastInsertRowid, { name_en });
  res.json({ id: info.lastInsertRowid });
});

router.put('/stations/:id', canManage, (req, res) => {
  const { name_ar, name_en, lat, lng, status } = req.body;
  db.prepare('UPDATE stations SET name_ar=?, name_en=?, lat=?, lng=?, status=? WHERE id=?')
    .run(name_ar, name_en, lat, lng, status || 'active', req.params.id);
  logAction(req.user, 'update', 'station', req.params.id);
  res.json({ ok: true });
});

router.delete('/stations/:id', canManage, (req, res) => {
  db.prepare('DELETE FROM route_stations WHERE station_id=?').run(req.params.id);
  db.prepare('DELETE FROM stations WHERE id=?').run(req.params.id);
  logAction(req.user, 'delete', 'station', req.params.id);
  res.json({ ok: true });
});

/* ============================ المسارات وربطها بالمحطات ============================ */
router.get('/routes', (req, res) => {
  const routes = db.prepare('SELECT * FROM routes ORDER BY id ASC').all();
  const withStations = routes.map((r) => ({
    ...r,
    stations: db.prepare(
      `SELECT s.id, s.name_ar, s.name_en, s.lat, s.lng, rs.sequence, rs.dwell_seconds
       FROM route_stations rs JOIN stations s ON s.id=rs.station_id
       WHERE rs.route_id=? ORDER BY rs.sequence ASC`
    ).all(r.id),
  }));
  res.json(withStations);
});

router.post('/routes', canManage, (req, res) => {
  const { name_ar, name_en, color, start_time, end_time } = req.body;
  if (!name_ar || !name_en) return res.status(400).json({ error: 'اسم المسار بالعربية والإنجليزية مطلوب' });
  const info = db.prepare('INSERT INTO routes (name_ar, name_en, color, start_time, end_time) VALUES (?,?,?,?,?)')
    .run(name_ar, name_en, color || '#2563eb', start_time || '07:00', end_time || '22:00');
  logAction(req.user, 'create', 'route', info.lastInsertRowid, { name_en });
  res.json({ id: info.lastInsertRowid });
});

router.put('/routes/:id', canManage, (req, res) => {
  const { name_ar, name_en, color, start_time, end_time, status } = req.body;
  db.prepare('UPDATE routes SET name_ar=?, name_en=?, color=?, start_time=?, end_time=?, status=? WHERE id=?')
    .run(name_ar, name_en, color || '#2563eb', start_time, end_time, status || 'active', req.params.id);
  logAction(req.user, 'update', 'route', req.params.id);
  res.json({ ok: true });
});

router.delete('/routes/:id', canManage, (req, res) => {
  db.prepare('DELETE FROM route_stations WHERE route_id=?').run(req.params.id);
  db.prepare('UPDATE buses SET route_id=NULL WHERE route_id=?').run(req.params.id);
  db.prepare('DELETE FROM routes WHERE id=?').run(req.params.id);
  logAction(req.user, 'delete', 'route', req.params.id);
  res.json({ ok: true });
});

router.post('/routes/:id/stations', canManage, async (req, res) => {
  const { station_id, sequence, dwell_seconds } = req.body;
  if (!station_id) return res.status(400).json({ error: 'station_id مطلوب' });
  const info = db.prepare('INSERT INTO route_stations (route_id, station_id, sequence, dwell_seconds) VALUES (?,?,?,?)')
    .run(req.params.id, station_id, sequence || 999, dwell_seconds || 30);
  logAction(req.user, 'add_station_to_route', 'route', req.params.id, { station_id });

  const followsRoad = await recomputeRouteGeometry(req.params.id);
  res.json({ id: info.lastInsertRowid, followsRoad });
});

router.post('/routes/:id/recompute-geometry', canManage, async (req, res) => {
  const followsRoad = await recomputeRouteGeometry(req.params.id, true);
  logAction(req.user, 'recompute_geometry', 'route', req.params.id, { followsRoad });
  res.json({ followsRoad });
});

router.put('/routes/:id/geometry', canManage, (req, res) => {
  const { points } = req.body;
  if (!Array.isArray(points) || points.length < 2) {
    return res.status(400).json({ error: 'points يجب أن تكون مصفوفة من نقطتين على الأقل' });
  }
  db.prepare("UPDATE routes SET geometry = ?, geometry_source = 'manual' WHERE id = ?")
    .run(JSON.stringify(points), req.params.id);
  logAction(req.user, 'manual_route_draw', 'route', req.params.id, { pointCount: points.length });
  res.json({ ok: true });
});

router.delete('/routes/:routeId/stations/:stationId', canManage, async (req, res) => {
  db.prepare('DELETE FROM route_stations WHERE route_id=? AND station_id=?').run(req.params.routeId, req.params.stationId);
  logAction(req.user, 'remove_station_from_route', 'route', req.params.routeId, { station_id: req.params.stationId });

  const followsRoad = await recomputeRouteGeometry(req.params.routeId);
  res.json({ ok: true, followsRoad });
});

/* ============================ السائقون ============================ */
router.get('/drivers', (req, res) => res.json(db.prepare('SELECT * FROM drivers ORDER BY id ASC').all()));

router.post('/drivers', canManage, (req, res) => {
  const { name, phone, license_number } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم السائق مطلوب' });
  const info = db.prepare('INSERT INTO drivers (name, phone, license_number) VALUES (?,?,?)').run(name, phone || null, license_number || null);
  logAction(req.user, 'create', 'driver', info.lastInsertRowid, { name });
  res.json({ id: info.lastInsertRowid });
});

router.put('/drivers/:id', canManage, (req, res) => {
  const { name, phone, license_number, status } = req.body;
  db.prepare('UPDATE drivers SET name=?, phone=?, license_number=?, status=? WHERE id=?')
    .run(name, phone || null, license_number || null, status || 'active', req.params.id);
  logAction(req.user, 'update', 'driver', req.params.id);
  res.json({ ok: true });
});

router.delete('/drivers/:id', canManage, (req, res) => {
  db.prepare('UPDATE buses SET driver_id=NULL WHERE driver_id=?').run(req.params.id);
  db.prepare('DELETE FROM drivers WHERE id=?').run(req.params.id);
  logAction(req.user, 'delete', 'driver', req.params.id);
  res.json({ ok: true });
});

/* ============================ المستخدمون (super_admin فقط) ============================ */
router.get('/users', canManageUsers, (req, res) => {
  res.json(db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY id ASC').all());
});

router.post('/users', canManageUsers, (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).json({ error: 'الاسم والبريد وكلمة مرور لا تقل عن 8 أحرف مطلوبة' });
  }
  const validRoles = ['super_admin', 'transport_manager', 'dispatcher', 'viewer'];
  const finalRole = validRoles.includes(role) ? role : 'viewer';
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email.trim().toLowerCase())) {
    return res.status(409).json({ error: 'البريد مستخدم بالفعل' });
  }
  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
    .run(name, email.trim().toLowerCase(), hash, finalRole);
  logAction(req.user, 'create', 'user', info.lastInsertRowid, { email, role: finalRole });
  res.json({ id: info.lastInsertRowid });
});

router.put('/users/:id', canManageUsers, (req, res) => {
  const { name, role, password } = req.body;
  if (password) db.prepare('UPDATE users SET name=?, role=?, password_hash=? WHERE id=?').run(name, role, bcrypt.hashSync(password, 10), req.params.id);
  else db.prepare('UPDATE users SET name=?, role=? WHERE id=?').run(name, role, req.params.id);
  logAction(req.user, 'update', 'user', req.params.id);
  res.json({ ok: true });
});

router.delete('/users/:id', canManageUsers, (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'لا يمكنك حذف حسابك الخاص' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  logAction(req.user, 'delete', 'user', req.params.id);
  res.json({ ok: true });
});

/* ============================ التنبيهات ============================ */
router.get('/alerts', (req, res) => {
  const rows = db.prepare(
    `SELECT al.*, b.name as bus_name FROM alerts al LEFT JOIN buses b ON b.id=al.bus_id ORDER BY al.id DESC LIMIT 200`
  ).all();
  res.json(rows);
});

router.put('/alerts/:id/resolve', canManage, (req, res) => {
  db.prepare('UPDATE alerts SET resolved=1 WHERE id=?').run(req.params.id);
  logAction(req.user, 'resolve_alert', 'alert', req.params.id);
  res.json({ ok: true });
});

/* ============================ الإعلانات (لشاشات المحطات) ============================ */
router.get('/announcements', (req, res) => res.json(db.prepare('SELECT * FROM announcements ORDER BY id DESC').all()));

router.post('/announcements', canManage, (req, res) => {
  const { message_ar, message_en, station_scope, duration_seconds, expires_in_minutes } = req.body;
  if (!message_ar || !message_en) return res.status(400).json({ error: 'نص الإعلان بالعربية والإنجليزية مطلوب' });
  const minutes = parseInt(expires_in_minutes) || 0;
  const expiresAtSql = minutes > 0 ? `datetime('now', '+${minutes} minutes')` : 'NULL';
  const info = db.prepare(
    `INSERT INTO announcements (message_ar, message_en, station_scope, duration_seconds, expires_at) VALUES (?,?,?,?, ${expiresAtSql})`
  ).run(message_ar, message_en, station_scope || 'all', duration_seconds || 30);
  logAction(req.user, 'create', 'announcement', info.lastInsertRowid);
  res.json({ id: info.lastInsertRowid });
});

router.delete('/announcements/:id', canManage, (req, res) => {
  db.prepare('DELETE FROM announcements WHERE id=?').run(req.params.id);
  logAction(req.user, 'delete', 'announcement', req.params.id);
  res.json({ ok: true });
});

/* ============================ بلاغات السائقين ============================ */
router.get('/incidents', (req, res) => {
  res.json(db.prepare(
    `SELECT ir.*, b.name as bus_name, d.name as driver_name FROM incident_reports ir
     LEFT JOIN buses b ON b.id=ir.bus_id LEFT JOIN drivers d ON d.id=ir.driver_id ORDER BY ir.id DESC LIMIT 200`
  ).all());
});

router.put('/incidents/:id/resolve', canManage, (req, res) => {
  db.prepare('UPDATE incident_reports SET resolved=1 WHERE id=?').run(req.params.id);
  logAction(req.user, 'resolve_incident', 'incident', req.params.id);
  res.json({ ok: true });
});

/* ============================ سجل التدقيق ============================ */
router.get('/audit-logs', canManageUsers, (req, res) => {
  res.json(db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 300').all());
});

/* ============================ التقارير ============================ */
router.get('/reports/arrivals', (req, res) => {
  res.json(db.prepare(
    `SELECT a.id, a.arrived_at, b.name as bus_name, b.plate_number, r.name_ar as route_ar, r.name_en as route_en, s.name_ar as station_ar, s.name_en as station_en
     FROM arrivals a JOIN buses b ON b.id=a.bus_id JOIN stations s ON s.id=a.station_id LEFT JOIN routes r ON r.id=b.route_id
     ORDER BY a.id DESC LIMIT 1000`
  ).all());
});

router.get('/reports/arrivals.csv', (req, res) => {
  const rows = db.prepare(
    `SELECT a.arrived_at, b.name as bus_name, b.plate_number, s.name_en as station, r.name_en as route
     FROM arrivals a JOIN buses b ON b.id=a.bus_id JOIN stations s ON s.id=a.station_id LEFT JOIN routes r ON r.id=b.route_id
     ORDER BY a.id DESC LIMIT 5000`
  ).all();
  const header = 'Arrived At,Bus,Plate Number,Station,Route\n';
  const body = rows.map((r) => [r.arrived_at, r.bus_name, r.plate_number || '', r.station, r.route || ''].map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="arrivals-report.csv"');
  res.send('\uFEFF' + header + body);
});

router.get('/reports/summary', (req, res) => {
  res.json(db.prepare(
    `SELECT b.name as bus_name, b.plate_number,
       COUNT(a.id) as arrivals_count,
       SUM(CASE WHEN a.arrived_at >= datetime('now','-1 day') THEN 1 ELSE 0 END) as arrivals_today
     FROM buses b LEFT JOIN arrivals a ON a.bus_id=b.id AND a.arrived_at >= datetime('now','-7 days')
     GROUP BY b.id ORDER BY arrivals_count DESC`
  ).all());
});

module.exports = router;
