// routes/api.js — واجهات القراءة العامة (بدون تسجيل دخول) لشاشات العرض وصفحات المحطات والمباني وشاشة اللمس
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

/* ============================ المسارات ============================ */
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

/* ============================ المحطات ============================ */
router.get('/stations', (req, res) => {
  res.json(db.prepare('SELECT * FROM stations ORDER BY name_en ASC').all());
});

/* ============================ كل الحافلات (للخريطة الرئيسية) ============================ */
router.get('/buses', (req, res) => {
  const buses = db.prepare('SELECT * FROM buses').all();
  const enriched = buses.map((b) => {
    const nextStation = b.next_station_id ? db.prepare('SELECT * FROM stations WHERE id=?').get(b.next_station_id) : null;
    const currentStation = b.current_station_id ? db.prepare('SELECT * FROM stations WHERE id=?').get(b.current_station_id) : null;
    const route = b.route_id ? db.prepare('SELECT * FROM routes WHERE id=?').get(b.route_id) : null;
    const { device_key, ...safe } = b;
    let _etaSeconds = null;
    if (nextStation && b.current_lat != null && b.current_lng != null) {
      const dist = haversineMeters(b.current_lat, b.current_lng, nextStation.lat, nextStation.lng);
      _etaSeconds = estimateEtaSeconds(dist, b.current_speed);
    }
    return { ...safe, nextStation, currentStation, route, _etaSeconds, statusLabel: STATUS_LABELS[b.status] || { ar: b.status, en: b.status } };
  });
  res.json(enriched);
});

/* ============================ الحافلات القادمة إلى محطة معيّنة (لصفحات /station/:id) ============================ */
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

/* ============================ سجل حركة حافلة معيّنة ============================ */
router.get('/buses/:id/history', (req, res) => {
  const points = db
    .prepare('SELECT lat, lng, speed, recorded_at FROM gps_history WHERE bus_id=? ORDER BY id DESC LIMIT 50')
    .all(req.params.id);
  res.json(points.reverse());
});

/* ============================ سجل الوصول العام ============================ */
router.get('/arrivals', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.id, a.arrived_at, b.name as bus_name, s.name_ar as station_ar, s.name_en as station_en
       FROM arrivals a JOIN buses b ON b.id=a.bus_id JOIN stations s ON s.id=a.station_id
       ORDER BY a.id DESC LIMIT 100`
    ).all();
  res.json(rows);
});

/* ============================ الإعلانات ============================ */
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

/* ============================ المباني (الكليات) ============================ */
router.get('/buildings', (req, res) => {
  res.json(db.prepare('SELECT * FROM buildings ORDER BY name_ar ASC').all());
});

function nearestStationTo(point, stations) {
  let nearest = null, nearestDist = Infinity;
  stations.forEach((s) => {
    const d = haversineMeters(point.lat, point.lng, s.lat, s.lng);
    if (d < nearestDist) { nearestDist = d; nearest = s; }
  });
  return { station: nearest, distanceMeters: Math.round(nearestDist) };
}

function computeEtaAlongRoute(bus, routeId, targetStationId) {
  if (!bus.next_station_id) return null;
  const seq = db.prepare(`
    SELECT s.id as station_id, s.lat, s.lng, rs.sequence
    FROM route_stations rs JOIN stations s ON s.id = rs.station_id
    WHERE rs.route_id = ? ORDER BY rs.sequence ASC
  `).all(routeId);
  const n = seq.length;
  const nextIdx = seq.findIndex((s) => s.station_id === bus.next_station_id);
  if (nextIdx === -1 || n === 0) return null;

  let targetIdx = -1, minSteps = Infinity;
  seq.forEach((s, i) => {
    if (s.station_id === targetStationId) {
      const steps = (i - nextIdx + n) % n;
      if (steps < minSteps) { minSteps = steps; targetIdx = i; }
    }
  });
  if (targetIdx === -1) return null;

  let totalMeters = haversineMeters(bus.current_lat, bus.current_lng, seq[nextIdx].lat, seq[nextIdx].lng);
  let idx = nextIdx;
  while (idx !== targetIdx) {
    const nextI = (idx + 1) % n;
    totalMeters += haversineMeters(seq[idx].lat, seq[idx].lng, seq[nextI].lat, seq[nextI].lng);
    idx = nextI;
  }
  return estimateEtaSeconds(totalMeters, bus.current_speed);
}

// إيجاد أقرب محطة لمبنى معيّن + كل الحافلات القادمة إليها (تُستخدم بشاشة اللمس القديمة إن لزم)
router.get('/buildings/:id/arrivals', (req, res) => {
  const building = db.prepare('SELECT * FROM buildings WHERE id=?').get(req.params.id);
  if (!building) return res.status(404).json({ error: 'المبنى غير موجود' });

  const stations = db.prepare('SELECT * FROM stations').all();
  if (!stations.length) return res.json({ station: null, distanceMeters: null, buses: [] });

  const { station: nearest, distanceMeters } = nearestStationTo(building, stations);

  const candidateBuses = db.prepare(`
    SELECT DISTINCT b.* FROM buses b
    JOIN route_stations rs ON rs.route_id = b.route_id
    WHERE rs.station_id = ? AND b.current_lat IS NOT NULL AND b.current_lng IS NOT NULL
  `).all(nearest.id);

  const enriched = candidateBuses.map((b) => {
    const route = b.route_id ? db.prepare('SELECT * FROM routes WHERE id=?').get(b.route_id) : null;
    const routeGeometry = route && route.geometry ? JSON.parse(route.geometry) : null;
    const { device_key, ...safe } = b;
    const _etaSeconds = b.route_id ? computeEtaAlongRoute(b, b.route_id, nearest.id) : null;
    return { ...safe, route: route ? { ...route, geometry: routeGeometry } : null, _etaSeconds };
  });

  enriched.sort((a, b) => (a._etaSeconds ?? 1e9) - (b._etaSeconds ?? 1e9));
  res.json({ station: nearest, distanceMeters, buses: enriched });
});

// نقطة انطلاق ثابتة (محطة الشاشة نفسها) + وجهة (مبنى) — يرجع الحافلات على المسارات الصحيحة بينهم فقط
router.get('/stations/:originStationId/to-building/:destId/arrivals', (req, res) => {
  const originStation = db.prepare('SELECT * FROM stations WHERE id=?').get(req.params.originStationId);
  const dest = db.prepare('SELECT * FROM buildings WHERE id=?').get(req.params.destId);
  if (!originStation || !dest) return res.status(404).json({ error: 'بيانات غير صالحة' });

  const stations = db.prepare('SELECT * FROM stations').all();
  const { station: destStation, distanceMeters } = nearestStationTo(dest, stations);

  const validRoutes = db.prepare(`
    SELECT r.* FROM routes r
    WHERE EXISTS (SELECT 1 FROM route_stations rs WHERE rs.route_id=r.id AND rs.station_id=?)
      AND EXISTS (SELECT 1 FROM route_stations rs2 WHERE rs2.route_id=r.id AND rs2.station_id=?)
  `).all(originStation.id, destStation.id);

  if (!validRoutes.length) {
    return res.json({ originStation, destStation, distanceMeters, buses: [], noRouteFound: true });
  }

  const routeIds = validRoutes.map((r) => r.id);
  const placeholders = routeIds.map(() => '?').join(',');
  const candidateBuses = db.prepare(
    `SELECT * FROM buses WHERE route_id IN (${placeholders}) AND current_lat IS NOT NULL AND current_lng IS NOT NULL`
  ).all(...routeIds);

  const enriched = candidateBuses.map((b) => {
    const route = validRoutes.find((r) => r.id === b.route_id);
    const routeGeometry = route && route.geometry ? JSON.parse(route.geometry) : null;
    const { device_key, ...safe } = b;
    const _etaSeconds = computeEtaAlongRoute(b, b.route_id, destStation.id);
    return { ...safe, route: route ? { ...route, geometry: routeGeometry } : null, _etaSeconds };
  });

  enriched.sort((a, b) => (a._etaSeconds ?? 1e9) - (b._etaSeconds ?? 1e9));
  res.json({ originStation, destStation, distanceMeters, buses: enriched });
});

/* ============================ تقييم الخدمة ============================ */
router.post('/ratings', (req, res) => {
  const { punctuality, cleanliness, driver_behavior, had_difficulty, note } = req.body;
  db.prepare('INSERT INTO ratings (punctuality, cleanliness, driver_behavior, had_difficulty, note) VALUES (?,?,?,?,?)')
    .run(punctuality || null, cleanliness || null, driver_behavior || null, had_difficulty != null ? (had_difficulty ? 1 : 0) : null, note || null);
  res.json({ ok: true });
});

/* ============================ أرقام هواتف البلاغات ============================ */
router.get('/settings/phones', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('phone_security','phone_maintenance','phone_transport')").all();
  const map = {};
  rows.forEach((r) => { map[r.key] = r.value; });
  res.json(map);
});

module.exports = router;
