// services/routing.js — يحسب مسار الطريق الفعلي (على الشوارع) بين محطات المسار
// يستخدم OSRM العام (مجاني، مبني على بيانات OpenStreetMap نفسها المستخدمة في الخريطة)
// إذا فشل الاتصال أو لم يوجد طريق، يرجع null ويقوم الاستدعاء بالرجوع لخط مستقيم كحل بديل آمن

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving/';

// stations: مصفوفة مرتبة [{ lat, lng }, ...]
// يرجع مصفوفة نقاط [[lat,lng], [lat,lng], ...] تمثل المسار الفعلي على الطرق، أو null عند الفشل
async function fetchRoadGeometry(stations) {
  if (!stations || stations.length < 2) return null;

  const coords = stations.map((s) => `${s.lng},${s.lat}`).join(';');
  const url = `${OSRM_BASE}${coords}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // لا تعلّق الطلب أكثر من 8 ثوانٍ
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes || !data.routes[0]) return null;

    // GeoJSON يرجع [lng, lat] لكل نقطة — نعكسها إلى [lat, lng] لتوافق Leaflet
    return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
  } catch (e) {
    console.error('OSRM routing failed, falling back to straight line:', e.message);
    return null;
  }
}

module.exports = { fetchRoadGeometry };
