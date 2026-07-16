// seed.js — بيانات تجريبية كاملة: 3 مسارات، 12 محطة، 10 حافلات، 10 سائقين، حسابات دخول، إعلان تجريبي
const bcrypt = require('bcryptjs');
const db = require('./db');

const insertStation = db.prepare('INSERT INTO stations (code, name_ar, name_en, lat, lng) VALUES (?,?,?,?,?)');
const insertRoute = db.prepare('INSERT INTO routes (name_ar, name_en, color) VALUES (?,?,?)');
const insertRouteStation = db.prepare('INSERT INTO route_stations (route_id, station_id, sequence, dwell_seconds) VALUES (?,?,?,?)');
const insertDriver = db.prepare('INSERT INTO drivers (name, phone, license_number, user_id) VALUES (?,?,?,?)');
const insertBus = db.prepare('INSERT INTO buses (name, plate_number, bus_type, seats, route_id, driver_id, device_key) VALUES (?,?,?,?,?,?,?)');
const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)');
const insertAnnouncement = db.prepare("INSERT INTO announcements (message_ar, message_en, station_scope, duration_seconds) VALUES (?,?,?,?)");

// نقطة مركزية تقريبية لجامعة الشارقة (للبيانات التجريبية فقط — عدّلها لتطابق الإحداثيات الفعلية)
const BASE_LAT = 25.2989;
const BASE_LNG = 55.4784;

const stationsData = [
  ['S1', 'البوابة الرئيسية', 'Main Gate', BASE_LAT + 0.0000, BASE_LNG + 0.0000],
  ['S2', 'مبنى الرئاسة', 'Chancellery Building', BASE_LAT + 0.0015, BASE_LNG + 0.0010],
  ['S3', 'كلية الهندسة', 'College of Engineering', BASE_LAT + 0.0030, BASE_LNG + 0.0022],
  ['S4', 'كلية الطب', 'College of Medicine', BASE_LAT + 0.0042, BASE_LNG + 0.0035],
  ['S5', 'المكتبة المركزية', 'Central Library', BASE_LAT + 0.0025, BASE_LNG + 0.0045],
  ['S6', 'كلية الشريعة والقانون', 'College of Sharia & Law', BASE_LAT + 0.0010, BASE_LNG + 0.0038],
  ['S7', 'السكن الطلابي (بنين)', "Men's Dormitory", BASE_LAT - 0.0020, BASE_LNG + 0.0028],
  ['S8', 'السكن الطلابي (بنات)', "Women's Dormitory", BASE_LAT - 0.0035, BASE_LNG + 0.0015],
  ['S9', 'المجمع الرياضي', 'Sports Complex', BASE_LAT - 0.0018, BASE_LNG - 0.0005],
  ['S10', 'اتحاد الطلبة', 'Student Union', BASE_LAT - 0.0005, BASE_LNG + 0.0008],
  ['S11', 'المركز الصحي', 'Health Center', BASE_LAT + 0.0008, BASE_LNG - 0.0012],
  ['S12', 'موقف السيارات C', 'Parking C', BASE_LAT - 0.0010, BASE_LNG - 0.0022],
];
const stationIds = stationsData.map(([code, ar, en, lat, lng]) => insertStation.run(code, ar, en, lat, lng).lastInsertRowid);
const S = (n) => stationIds[n - 1]; // S(1) => id of station #1

// المسار A: الحلقة الرئيسية (أزرق)
const routeA = insertRoute.run('المسار الرئيسي (الحلقة الكبرى)', 'Main Loop', '#2563eb').lastInsertRowid;
[[S(1), 1], [S(2), 2], [S(3), 3], [S(4), 4], [S(5), 5], [S(6), 6], [S(10), 7], [S(1), 8]]
  .forEach(([stationId, seq]) => insertRouteStation.run(routeA, stationId, seq, 30));

// المسار B: السكن الجامعي (أخضر)
const routeB = insertRoute.run('مسار السكن الجامعي', 'Dormitories Route', '#16a34a').lastInsertRowid;
[[S(1), 1], [S(7), 2], [S(8), 3], [S(9), 4], [S(11), 5], [S(1), 6]]
  .forEach(([stationId, seq]) => insertRouteStation.run(routeB, stationId, seq, 30));

// المسار C: مكوك المواقف (ذهبي)
const routeC = insertRoute.run('مكوك المواقف', 'Parking Shuttle', '#d97706').lastInsertRowid;
[[S(1), 1], [S(12), 2], [S(9), 3], [S(1), 4]]
  .forEach(([stationId, seq]) => insertRouteStation.run(routeC, stationId, seq, 20));

// السائقون والحافلات (10 حافلات موزعة على المسارات الثلاثة)
const driverNames = [
  'أحمد سالم', 'محمد راشد', 'خالد عبدالله', 'سعيد حميد', 'علي مبارك',
  'يوسف إبراهيم', 'راشد سعيد', 'حمد خليفة', 'سلطان أحمد', 'ماجد سالم',
];
const busPlan = [
  ['Bus 1', routeA], ['Bus 2', routeA], ['Bus 3', routeA], ['Bus 4', routeA],
  ['Bus 5', routeB], ['Bus 6', routeB], ['Bus 7', routeB],
  ['Bus 8', routeC], ['Bus 9', routeC], ['Bus 10', routeA],
];

busPlan.forEach(([name, routeId], i) => {
  const driverId = insertDriver.run(driverNames[i], '05' + (10000000 + i * 111), 'DL-' + (10021 + i), null).lastInsertRowid;
  insertBus.run(name, 'UNI-0' + (i + 1 < 10 ? '0' + (i + 1) : i + 1), 'standard', 40, routeId, driverId, 'DEVICE-KEY-BUS-' + (i + 1));
});

// حسابات الدخول الافتراضية (غيّر كلمات المرور فور أول دخول فعلي)
const users = [
  ['المدير العام', 'admin@sharjah.ac.ae', 'ChangeMe123!', 'super_admin'],
  ['مدير النقل', 'transport@sharjah.ac.ae', 'ChangeMe123!', 'transport_manager'],
  ['موظف التشغيل', 'dispatcher@sharjah.ac.ae', 'ChangeMe123!', 'dispatcher'],
  ['مشاهدة فقط', 'viewer@sharjah.ac.ae', 'ChangeMe123!', 'viewer'],
  ['السائق أحمد سالم', 'driver1@sharjah.ac.ae', 'ChangeMe123!', 'driver'],
];
const userIds = {};
users.forEach(([name, email, password, role]) => {
  const id = insertUser.run(name, email, bcrypt.hashSync(password, 10), role).lastInsertRowid;
  userIds[email] = id;
});

// ربط حساب السائق التجريبي بسجل السائق الأول (أحمد سالم)
db.prepare('UPDATE drivers SET user_id=? WHERE name=?').run(userIds['driver1@sharjah.ac.ae'], driverNames[0]);

// إعلان تجريبي يظهر في شريط التنبيهات المتحرك بكل المحطات
insertAnnouncement.run(
  'مرحبًا بكم في جامعة الشارقة — يرجى الانتظار داخل الأماكن المخصصة لضمان سلامتكم',
  'Welcome to the University of Sharjah — please wait in designated areas for your safety',
  'all', 30
);

console.log('✅ تم إدخال بيانات تجريبية كاملة:');
console.log('   - 12 محطة، 3 مسارات، 10 حافلات، 10 سائقين');
console.log('   مفاتيح أجهزة الحافلات: DEVICE-KEY-BUS-1 إلى DEVICE-KEY-BUS-10');
console.log('   حسابات الدخول (غيّرها فور أول دخول):');
users.forEach(([name, email, password, role]) => console.log(`     - ${email} / ${password}  (${role})`));
