// demo_fleet.js — 5 حافلات تجريبية لكل مسار، تتحرك على المسار الفعلي المرسوم (OSRM أو رسم يدوي)
// بتوقيت وصول منتظم ودقيق لكل محطة (المسار 1: كل 5 دقائق، المسار 2: كل 10 دقائق...)
// الاستخدام: node demo_fleet.js
const db = require('./db');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000/api/gps';
const TICK_MS = 3000;
const BUSES_PER_ROUTE = 5;
const HEADWAY_STEP_MINUTES = 5;
const DEMO_COLORS = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#dc2626', '#0891b2', '#be185d', '#0d9488', '#65a30d', '#7c3aed'];

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getRouteStations(routeId) {
  return db.prepare(
    `SELECT s.id, s.name_ar, s.lat, s.lng, rs.sequence FROM route_stations rs JOIN stations s ON s.id = rs.station_id
     WHERE rs.route_id = ? ORDER BY rs.sequence ASC`
  ).all(routeId);
}

// يرجع نقاط المسار الفعلي المرسوم (geometry) إن وُجد، وإلا يرجع لخط مستقيم بين المحطات كحل بديل
function getRoutePathPoints(route, stations) {
  if (route.geometry) {
    try {
      const geo = JSON.parse(route.geometry);
      if (Array.isArray(geo) && geo.length > 1) {
        return geo.map((p) => ({ lat: p[0], lng: p[1] }));
      }
    } catch (e) { /* تجاهل وارجع للمحطات */ }
  }
  return stations.map((s) => ({ lat: s.lat, lng: s.lng }));
}

function buildLoopPath(points) {
  const loop = [...points, points[0]]; // إغلاق الحلقة بالرجوع لنقطة البداية
  const cumulative = [0];
  for (let i = 1; i < loop.length; i++) {
    cumulative.push(cumulative[i - 1] + haversineKm(loop[i - 1].lat, loop[i - 1].lng, loop[i].lat, loop[i].lng));
  }
  return { loop, cumulative, totalKm: cumulative[cumulative.length - 1] };
}

function positionAtDistance(path, distanceKm) {
  const d = ((distanceKm % path.totalKm) + path.totalKm) % path.totalKm;
  for (let i = 1; i < path.cumulative.length; i++) {
    if (d <= path.cumulative[i]) {
      const segStart = path.cumulative[i - 1], segEnd = path.cumulative[i];
      const t = segEnd === segStart ? 0 : (d - segStart) / (segEnd - segStart);
      const a = path.loop[i - 1], b = path.loop[i];
      return { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t };
    }
  }
  return { lat: path.loop[0].lat, lng: path.loop[0].lng };
}

const routes = db.prepare('SELECT * FROM routes').all();
if (!routes.length) {
  console.log('⚠️ لا توجد أي مسارات بالنظام. أضف مسارًا واحدًا على الأقل من لوحة الإدارة أولًا.');
  process.exit(0);
}

const insertBus = db.prepare('INSERT INTO buses (name, plate_number, route_id, device_key, color) VALUES (?,?,?,?,?)');
const getBusByKey = db.prepare('SELECT * FROM buses WHERE device_key=?');

function ensureDemoBuses(route, count) {
  const buses = [];
  for (let i = 1; i <= count; i++) {
    const deviceKey = `DEMO-R${route.id}-B${i}`;
    let bus = getBusByKey.get(deviceKey);
    if (!bus) {
      const color = DEMO_COLORS[(route.id + i) % DEMO_COLORS.length];
      insertBus.run(`${route.name_ar} - تجريبي ${i}`, `DEMO-${route.id}${i}`, route.id, deviceKey, color);
      bus = getBusByKey.get(deviceKey);
      console.log(`✅ أُنشئت: ${bus.name} (${deviceKey})`);
    } else {
      console.log(`↺ موجودة أصلًا: ${bus.name} (${deviceKey})`);
    }
    buses.push(bus);
  }
  return buses;
}

const fleet = [];

routes.forEach((route, routeIndex) => {
  const stations = getRouteStations(route.id);
  if (stations.length < 2) {
    console.log(`⚠️ المسار "${route.name_ar}" ما فيه محطتين على الأقل — تم تجاهله.`);
    return;
  }

  const pathPoints = getRoutePathPoints(route, stations);
  const usingGeometry = !!route.geometry;
  const path = buildLoopPath(pathPoints);
  const headwayMinutes = (routeIndex + 1) * HEADWAY_STEP_MINUTES;
  const fullLoopMinutes = headwayMinutes * BUSES_PER_ROUTE;
  const speedKmh = path.totalKm / (fullLoopMinutes / 60);

  console.log(`\n🛣️ ${route.name_ar}: ${usingGeometry ? 'يتبع المسار المرسوم على الطرق ✅' : 'تحذير: لا يوجد مسار مرسوم، يستخدم خط مستقيم ⚠️'} — طول الحلقة ${path.totalKm.toFixed(2)} كم — حافلة كل ${headwayMinutes} دقائق — سرعة ${speedKmh.toFixed(1)} كم/س`);

  const buses = ensureDemoBuses(route, BUSES_PER_ROUTE);
  buses.forEach((bus, i) => {
    fleet.push({
      name: bus.name,
      deviceKey: bus.device_key,
      path,
      speedKmh,
      distanceKm: (i / BUSES_PER_ROUTE) * path.totalKm,
    });
  });
});

if (!fleet.length) {
  console.log('\n⚠️ ما فيه أي حافلة قابلة للتحريك — تأكد إن كل مسار فيه محطتين على الأقل.');
  process.exit(0);
}

async function tick(bus) {
  const kmPerTick = bus.speedKmh * (TICK_MS / 3600000);
  bus.distanceKm += kmPerTick;
  const pos = positionAtDistance(bus.path, bus.distanceKm);

  try {
    const res = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_key: bus.deviceKey, lat: pos.lat, lng: pos.lng, speed: bus.speedKmh, heading: 0, battery_level: 80 }),
    });
    const data = await res.json();
    if (data.eta) {
      const mins = Math.round(data.eta.etaSeconds / 60);
      console.log(`🚌 ${bus.name} → ستصل محطة "${data.eta.nextStationNameAr}" خلال ${mins < 1 ? 'أقل من دقيقة' : mins + ' دقيقة'}`);
    }
  } catch (e) {
    console.error(`${bus.name}: فشل إرسال الموقع — تأكد أن السيرفر يعمل`);
  }
}

console.log(`\n🚀 تشغيل ${fleet.length} حافلة تجريبية لايف الآن. اضغط Ctrl+C للإيقاف.\n`);
fleet.forEach((bus) => setInterval(() => tick(bus), TICK_MS));
