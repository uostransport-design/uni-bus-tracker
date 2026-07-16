// services/tracking.js — منطق معالجة موقع GPS مشترك (يُستخدم من مسار الجهاز ومن تطبيق السائق)
const db = require('../db');
const { findNextStation, estimateEtaSeconds, isOffRoute } = require('../utils');

const SPEED_LIMIT_KMH = 40;
const IDLE_THRESHOLD_MS = 5 * 60 * 1000;

function getRouteStations(routeId) {
  return db.prepare(
    `SELECT s.id, s.name_ar, s.name_en, s.lat, s.lng, rs.sequence, rs.dwell_seconds
     FROM route_stations rs JOIN stations s ON s.id = rs.station_id
     WHERE rs.route_id = ? ORDER BY rs.sequence ASC`
  ).all(routeId);
}

function maybeCreateAlert(busId, type, message, severity = 'warning') {
  const recent = db
    .prepare(`SELECT id FROM alerts WHERE bus_id=? AND type=? AND resolved=0 AND created_at >= datetime('now','-10 minutes')`)
    .get(busId, type);
  if (recent) return;
  db.prepare(`INSERT INTO alerts (bus_id, type, message, severity) VALUES (?,?,?,?)`).run(busId, type, message, severity);
}

// bus: صف الحافلة الحالي من قاعدة البيانات، data: { lat, lng, speed, heading, battery_level }
function ingestLocation(bus, data, io) {
  const { lat, lng, speed, heading, battery_level } = data;
  const now = new Date().toISOString();
  const spd = speed || 0;

  let idleSince = bus.idle_since;
  if (spd < 1) { if (!idleSince) idleSince = now; }
  else idleSince = null;

  db.prepare(
    `UPDATE buses SET current_lat=?, current_lng=?, current_speed=?, heading=?, battery_level=?, last_gps_at=?, idle_since=?, connectivity='online' WHERE id=?`
  ).run(lat, lng, spd, heading || 0, battery_level ?? bus.battery_level, now, idleSince, bus.id);

  db.prepare(`INSERT INTO gps_history (bus_id, lat, lng, speed, recorded_at) VALUES (?,?,?,?,?)`).run(bus.id, lat, lng, spd, now);

  if (spd > SPEED_LIMIT_KMH) {
    maybeCreateAlert(bus.id, 'speeding', `تجاوزت ${bus.name} السرعة المحددة (${Math.round(spd)} كم/س)`, 'critical');
  }
  if (idleSince && Date.now() - new Date(idleSince).getTime() > IDLE_THRESHOLD_MS) {
    maybeCreateAlert(bus.id, 'idle', `${bus.name} متوقفة عن الحركة منذ أكثر من 5 دقائق`, 'warning');
  }

  let etaPayload = null;
  let newStatus = bus.status;
  let offRoute = 0;

  if (bus.route_id) {
    const stations = getRouteStations(bus.route_id);
    if (stations.length) {
      offRoute = isOffRoute(lat, lng, stations) ? 1 : 0;
      if (offRoute && !bus.off_route) {
        maybeCreateAlert(bus.id, 'geofence', `${bus.name} خرجت عن المسار المحدد`, 'critical');
      }

      const { current, next, distance, arrivedStationId } = findNextStation(lat, lng, stations);

      if (arrivedStationId) {
        db.prepare(`INSERT INTO arrivals (bus_id, station_id, arrived_at) VALUES (?,?,?)`).run(bus.id, arrivedStationId, now);
      }

      const etaSeconds = estimateEtaSeconds(distance, spd);
      db.prepare('UPDATE buses SET next_station_id=?, current_station_id=?, off_route=? WHERE id=?').run(
        next.id, current ? current.id : bus.current_station_id, offRoute, bus.id
      );

      if (!bus.status_override) {
        if (distance < 30 && spd < 2) newStatus = 'at_station';
        else if (etaSeconds < 120) newStatus = 'approaching';
        else newStatus = 'in_service';
      }

      etaPayload = {
        nextStationId: next.id,
        nextStationNameAr: next.name_ar,
        nextStationNameEn: next.name_en,
        distanceMeters: Math.round(distance),
        etaSeconds,
      };
    }
  }

  if (newStatus !== bus.status) db.prepare('UPDATE buses SET status=? WHERE id=?').run(newStatus, bus.id);

  io.emit('bus:update', {
    busId: bus.id, name: bus.name, lat, lng, speed: spd, heading: heading || 0,
    status: newStatus, offRoute, batteryLevel: battery_level ?? bus.battery_level,
    lastUpdate: now, eta: etaPayload,
  });

  return { eta: etaPayload, status: newStatus };
}

module.exports = { ingestLocation, getRouteStations, maybeCreateAlert, SPEED_LIMIT_KMH, IDLE_THRESHOLD_MS };
