// utils.js — حسابات جغرافية: المسافة (Haversine)، تقدير وقت الوصول، وكشف الخروج عن المسار

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function estimateEtaSeconds(distanceMeters, speedKmh) {
  // نتجاهل قراءات السرعة اللحظية غير الواقعية (متوقفة لحظيًا، أو تشويش GPS طبيعي بالجوال)
  // ونعتمد بدلها على سرعة ثابتة معقولة داخل الحرم الجامعي، حتى يكون الترتيب والوقت مستقرين ومنطقيين دايمًا
  const MIN_REALISTIC_KMH = 10;
  const MAX_REALISTIC_KMH = 40;
  const DEFAULT_CAMPUS_SPEED_KMH = 20;

  let effectiveSpeed = speedKmh || 0;
  if (effectiveSpeed < MIN_REALISTIC_KMH || effectiveSpeed > MAX_REALISTIC_KMH) {
    effectiveSpeed = DEFAULT_CAMPUS_SPEED_KMH;
  }

  const speedMs = (effectiveSpeed * 1000) / 3600;
  return Math.round(distanceMeters / speedMs);
}

// stations: مصفوفة محطات المسار مرتبة حسب sequence، كل عنصر فيها { id, lat, lng, ... }
function findNextStation(currentLat, currentLng, stations) {
  let nearestIndex = 0;
  let nearestDist = Infinity;
  stations.forEach((s, i) => {
    const d = haversineMeters(currentLat, currentLng, s.lat, s.lng);
    if (d < nearestDist) { nearestDist = d; nearestIndex = i; }
  });

  if (nearestDist < 30 && nearestIndex < stations.length - 1) {
    const next = stations[nearestIndex + 1];
    return {
      current: stations[nearestIndex],
      next,
      distance: haversineMeters(currentLat, currentLng, next.lat, next.lng),
      arrivedStationId: stations[nearestIndex].id,
    };
  }
  return { current: null, next: stations[nearestIndex], distance: nearestDist, arrivedStationId: null };
}

const GEOFENCE_TOLERANCE_METERS = 250;

function isOffRoute(currentLat, currentLng, stations) {
  if (!stations.length) return false;
  let minDist = Infinity;
  stations.forEach((s) => {
    const d = haversineMeters(currentLat, currentLng, s.lat, s.lng);
    if (d < minDist) minDist = d;
  });
  return minDist > GEOFENCE_TOLERANCE_METERS;
}

module.exports = { haversineMeters, estimateEtaSeconds, findNextStation, isOffRoute, GEOFENCE_TOLERANCE_METERS };
