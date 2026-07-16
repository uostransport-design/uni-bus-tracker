// routes/driver.js — واجهة تطبيق/صفحة السائق: بدء/إنهاء الرحلة، مشاركة الموقع، البلاغات
const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ingestLocation } = require('../services/tracking');
const { logAction } = require('../middleware/audit');

module.exports = function (io) {
  const router = express.Router();
  router.use(requireAuth, requireRole('driver'));

  function getOrCreateDriverRecord(user) {
    let driver = db.prepare('SELECT * FROM drivers WHERE user_id=?').get(user.id);
    if (!driver) {
      const info = db.prepare('INSERT INTO drivers (name, user_id) VALUES (?,?)').run(user.name, user.id);
      driver = db.prepare('SELECT * FROM drivers WHERE id=?').get(info.lastInsertRowid);
    }
    return driver;
  }

  // الحافلات المتاحة للاختيار (النشطة فقط)
  router.get('/vehicles', (req, res) => {
    const rows = db.prepare(
      `SELECT b.id, b.name, b.plate_number, r.name_ar as route_name_ar, r.name_en as route_name_en
       FROM buses b LEFT JOIN routes r ON r.id=b.route_id
       WHERE b.vehicle_status='active' ORDER BY b.name ASC`
    ).all();
    res.json(rows);
  });

  // الرحلة النشطة الحالية لهذا السائق (إن وجدت)
  router.get('/trip/active', (req, res) => {
    const driver = getOrCreateDriverRecord(req.user);
    const trip = db.prepare(`SELECT * FROM trips WHERE driver_id=? AND status='active' ORDER BY id DESC LIMIT 1`).get(driver.id);
    if (!trip) return res.json({ trip: null });
    const bus = db.prepare('SELECT * FROM buses WHERE id=?').get(trip.bus_id);
    const route = bus.route_id ? db.prepare('SELECT * FROM routes WHERE id=?').get(bus.route_id) : null;
    const stations = bus.route_id ? db.prepare(
      `SELECT s.* , rs.sequence FROM route_stations rs JOIN stations s ON s.id=rs.station_id WHERE rs.route_id=? ORDER BY rs.sequence ASC`
    ).all(bus.route_id) : [];
    res.json({ trip, bus, route, stations });
  });

  router.post('/trip/start', (req, res) => {
    const { bus_id } = req.body;
    if (!bus_id) return res.status(400).json({ error: 'bus_id مطلوب' });
    const driver = getOrCreateDriverRecord(req.user);

    const existing = db.prepare(`SELECT * FROM trips WHERE driver_id=? AND status='active'`).get(driver.id);
    if (existing) return res.status(409).json({ error: 'لديك رحلة نشطة بالفعل، أنهها أولًا' });

    const bus = db.prepare('SELECT * FROM buses WHERE id=?').get(bus_id);
    if (!bus) return res.status(404).json({ error: 'الحافلة غير موجودة' });

    db.prepare('UPDATE buses SET driver_id=?, status=?, status_override=0 WHERE id=?').run(driver.id, 'in_service', bus_id);
    const info = db.prepare(
      `INSERT INTO trips (bus_id, driver_id, route_id, started_at, status) VALUES (?,?,?, datetime('now'), 'active')`
    ).run(bus_id, driver.id, bus.route_id);

    logAction(req.user, 'trip_start', 'trip', info.lastInsertRowid, { bus_id });
    res.json({ tripId: info.lastInsertRowid });
  });

  router.post('/trip/end', (req, res) => {
    const driver = getOrCreateDriverRecord(req.user);
    const trip = db.prepare(`SELECT * FROM trips WHERE driver_id=? AND status='active' ORDER BY id DESC LIMIT 1`).get(driver.id);
    if (!trip) return res.status(400).json({ error: 'لا توجد رحلة نشطة' });

    db.prepare(`UPDATE trips SET status='ended', ended_at=datetime('now') WHERE id=?`).run(trip.id);
    db.prepare(`UPDATE buses SET status='out_of_service', status_override=1, connectivity='offline' WHERE id=?`).run(trip.bus_id);
    logAction(req.user, 'trip_end', 'trip', trip.id);
    res.json({ ok: true });
  });

  // مشاركة الموقع من هاتف السائق (بدل جهاز GPS مخصص)
  router.post('/location', (req, res) => {
    const driver = getOrCreateDriverRecord(req.user);
    const trip = db.prepare(`SELECT * FROM trips WHERE driver_id=? AND status='active' ORDER BY id DESC LIMIT 1`).get(driver.id);
    if (!trip) return res.status(400).json({ error: 'ابدأ الرحلة أولًا قبل مشاركة الموقع' });

    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) return res.status(400).json({ error: 'lat و lng مطلوبان' });

    const bus = db.prepare('SELECT * FROM buses WHERE id=?').get(trip.bus_id);
    const result = ingestLocation(bus, req.body, io);
    res.json({ ok: true, ...result });
  });

  // تغيير حالة حافلته فقط (خارج الخدمة / طارئة / عودة للخدمة)
  router.put('/status', (req, res) => {
    const { status } = req.body;
    const valid = ['in_service', 'out_of_service', 'emergency'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' });

    const driver = getOrCreateDriverRecord(req.user);
    const trip = db.prepare(`SELECT * FROM trips WHERE driver_id=? AND status='active' ORDER BY id DESC LIMIT 1`).get(driver.id);
    if (!trip) return res.status(400).json({ error: 'لا توجد رحلة نشطة' });

    db.prepare('UPDATE buses SET status=?, status_override=? WHERE id=?').run(status, status === 'in_service' ? 0 : 1, trip.bus_id);
    logAction(req.user, 'status_change', 'bus', trip.bus_id, { status });
    res.json({ ok: true });
  });

  // بلاغ عطل / ازدحام / حادث / طارئ
  router.post('/incident', (req, res) => {
    const { type, note } = req.body;
    const valid = ['breakdown', 'congestion', 'accident', 'emergency'];
    if (!valid.includes(type)) return res.status(400).json({ error: 'نوع البلاغ غير صالح' });

    const driver = getOrCreateDriverRecord(req.user);
    const trip = db.prepare(`SELECT * FROM trips WHERE driver_id=? AND status='active' ORDER BY id DESC LIMIT 1`).get(driver.id);
    const busId = trip ? trip.bus_id : null;

    const info = db.prepare('INSERT INTO incident_reports (bus_id, driver_id, type, note) VALUES (?,?,?,?)')
      .run(busId, driver.id, type, note || null);

    if (type === 'emergency' && busId) db.prepare("UPDATE buses SET status='emergency' WHERE id=?").run(busId);

    logAction(req.user, 'incident_report', 'incident', info.lastInsertRowid, { type, busId });
    res.json({ id: info.lastInsertRowid });
  });

  return router;
};
