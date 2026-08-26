// routes/api.js — واجهات القراءة العامة (بدون تسجيل دخول) لشاشات العرض وصفحات المحطات
const express = require('express');
const db = require('../db');
const { haversineMeters, estimateEtaSeconds } = require('../utils');

const router = express.Router();

const STATUS_LABELS = {
  in_service: { ar: 'في الخدمة', en: 'In Service' },
  approaching: { ar: 'تقترب', en: 'Approaching' },
  at_station: { ar: 'عند المحطة', en: 'At Station' },
  delayed: { ar: 'متأخرة', en: 'Delayed' },
  out_of_service: { ar: 'خارج الخدمة', en: 'Out of Service' },
  emergency: { ar: 'حالة طارئة', en: 'Emergency' },
};

router.get('/routes', (req, res) => {
  const routes = db.prepare('SELECT * FROM routes').all();
  const withStations = routes.map((r) => ({
    ...r,
    geometry: r.geometry ? JSON.parse(r.geometry) : null,
    stations: db.prepare(
      `SELECT s.id, s.code, s.name_ar, s.name_en, s.lat, s.lng, rs.sequence
       FROM route_stations rs JOIN stations s ON s.id = rs.station_id
       WHERE rs.route_id=? ORDER BY rs.sequence ASC`
    ).all(r.id),
  }));
  res.json(withStations);
});

router.get('/stations', (req, res) => {
  res.json(db.prepare('SELECT * FROM stations ORDER BY name_en ASC').all());
});

router.get('/stations/:id/buses', (req, res) => {
  const stationId = Number(req.params.id);
  const station = db.prepare('SELECT * FROM stations WHERE id=?').get(stationId);
  const buses = db.prepare('SELECT * FROM buses WHERE next_station_id = ?').all(stationId);
  const enriched = buses.map((b) => {
    const route = b.route_id ? db.prepare('SELECT * FROM routes WHERE id=?').get(b.route_id) : null;
    const { device_key, ...safe } = b;
    let _etaSeconds = null;
    if (station && b.current_lat != null && b.current_lng != null) {
      const dist = haversineMeters(b.current_lat, b.current_lng, station.lat, station.lng);
      _etaSeconds = estimateEtaSeconds(dist, b.current_speed);
    }
    return { ...safe, route, _etaSeconds, statusLabel: STATUS_LABELS[b.status] || { ar: b.status, en: b.status } };
  });
  enriched.sort((a, b) => (a._etaSeconds ?? 1e9) - (b._etaSeconds ?? 1e9));
  res.json(enriched);
});

// الحافلات القادمة إلى محطة معيّنة فقط (تستخدمها صفحة /station/:id)
router.get('/stations/:id/buses', (req, res) => {
  const stationId = Number(req.params.id);
  const buses = db.prepare('SELECT * FROM buses WHERE next_station_id = ?').all(stationId);
  const enriched = buses.map((b) => {
    const route = b.route_id ? db.prepare('SELECT * FROM routes WHERE id=?').get(b.route_id) : null;
    const { device_key, ...safe } = b;
    return { ...safe, route, statusLabel: STATUS_LABELS[b.status] || { ar: b.status, en: b.status } };
  });
  res.json(enriched);
});

router.get('/buses/:id/history', (req, res) => {
  const points = db
    .prepare('SELECT lat, lng, speed, recorded_at FROM gps_history WHERE bus_id=? ORDER BY id DESC LIMIT 50')
    .all(req.params.id);
  res.json(points.reverse());
});

router.get('/arrivals', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id, a.arrived_at, b.name as bus_name, s.name_ar as station_ar, s.name_en as station_en
       FROM arrivals a JOIN buses b ON b.id=a.bus_id JOIN stations s ON s.id=a.station_id
       ORDER BY a.id DESC LIMIT 100`
    ).all();
  res.json(rows);
});

// إعلانات نشطة (لشريط التنبيهات المتحرك)، اختياريًا مفلترة حسب محطة
router.get('/announcements', (req, res) => {
  const stationId = req.query.station_id;
  const rows = db
    .prepare(`SELECT * FROM announcements WHERE expires_at IS NULL OR expires_at > datetime('now') ORDER BY id DESC`)
    .all();
  const filtered = stationId
    ? rows.filter((a) => a.station_scope === 'all' || (a.station_scope || '').split(',').includes(String(stationId)))
    : rows;
  res.json(filtered);
});

module.exports = router;
