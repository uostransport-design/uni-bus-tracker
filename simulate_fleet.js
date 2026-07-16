// simulate_fleet.js — وضع المحاكاة (Simulation Mode): يحرّك الحافلات العشر تلقائيًا على مساراتها
// الاستخدام: node simulate_fleet.js   (تأكد أن السيرفر يعمل و npm run seed تم تنفيذه أولًا)
const db = require('./db');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/api/gps';
const TICK_MS = 3000; // إرسال موقع كل 3 ثوانٍ لكل حافلة (يحاكي جهاز GPS حقيقي)

function getRouteStations(routeId) {
  return db.prepare(
    `SELECT s.id, s.lat, s.lng, rs.sequence
     FROM route_stations rs JOIN stations s ON s.id = rs.station_id
     WHERE rs.route_id = ? ORDER BY rs.sequence ASC`
  ).all(routeId);
}

const buses = db.prepare('SELECT * FROM buses WHERE route_id IS NOT NULL').all();
const fleet = buses.map((b) => ({
  id: b.id,
  name: b.name,
  deviceKey: b.device_key,
  stations: getRouteStations(b.route_id),
  segment: Math.floor(Math.random() * 3), // نقاط بداية عشوائية حتى لا تتحرك كل الحافلات معًا
  progress: Math.random(),
  speed: 18 + Math.round(Math.random() * 12), // 18-30 كم/س
}));

async function tick(bus) {
  if (bus.stations.length < 2) return;
  const from = bus.stations[bus.segment % bus.stations.length];
  const to = bus.stations[(bus.segment + 1) % bus.stations.length];

  const lat = from.lat + (to.lat - from.lat) * bus.progress;
  const lng = from.lng + (to.lng - from.lng) * bus.progress;

  bus.progress += 0.06;
  if (bus.progress >= 1) {
    bus.progress = 0;
    bus.segment = (bus.segment + 1) % bus.stations.length;
  }

  try {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_key: bus.deviceKey, lat, lng, speed: bus.speed, heading: 0, battery_level: 70 + Math.round(Math.random() * 30) }),
    });
    const data = await res.json();
    if (data.eta) {
      console.log(`${bus.name}: -> ${data.eta.nextStationNameEn} (${data.eta.etaSeconds}s) [${data.status}]`);
    }
  } catch (e) {
    console.error(`${bus.name}: فشل الإرسال — تأكد أن السيرفر يعمل على ${SERVER_URL}`);
  }
}

console.log(`🚌 بدء وضع المحاكاة لعدد ${fleet.length} حافلة، إرسال كل ${TICK_MS / 1000} ثوانٍ. اضغط Ctrl+C للإيقاف.`);
fleet.forEach((bus) => setInterval(() => tick(bus), TICK_MS + Math.random() * 500));
