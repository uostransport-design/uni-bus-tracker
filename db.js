// db.js — قاعدة بيانات SQLite (node:sqlite المدمجة) وكل جداول المنصة
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const fs = require('fs');
const DATA_DIR = fs.existsSync('/var/data') ? '/var/data' : __dirname;
const db = new DatabaseSync(path.join(DATA_DIR, 'bus_tracker.db'));
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  color TEXT DEFAULT '#2563eb',
  start_time TEXT DEFAULT '07:00',
  end_time TEXT DEFAULT '22:00',
  status TEXT DEFAULT 'active',
  geometry TEXT
);

CREATE TABLE IF NOT EXISTS stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  status TEXT DEFAULT 'active'
);

-- ربط المحطات بالمسارات مع ترتيبها ووقت التوقف المتوقع
CREATE TABLE IF NOT EXISTS route_stations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  route_id INTEGER NOT NULL,
  station_id INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  dwell_seconds INTEGER DEFAULT 30,
  FOREIGN KEY(route_id) REFERENCES routes(id),
  FOREIGN KEY(station_id) REFERENCES stations(id)
);

CREATE TABLE IF NOT EXISTS drivers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  license_number TEXT,
  status TEXT DEFAULT 'active',
  user_id INTEGER
);

CREATE TABLE IF NOT EXISTS buses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  plate_number TEXT,
  bus_type TEXT DEFAULT 'standard',
  seats INTEGER DEFAULT 40,
  photo_url TEXT,
  vehicle_status TEXT DEFAULT 'active',   -- active | maintenance | inactive
  status TEXT DEFAULT 'out_of_service',   -- in_service | approaching | at_station | delayed | out_of_service | emergency
  status_override INTEGER DEFAULT 0,      -- 1 إذا كانت الحالة مضبوطة يدويًا (لا يتم الكتابة فوقها تلقائيًا)
  connectivity TEXT DEFAULT 'offline',    -- online | offline (بحسب استقبال إشارة GPS مؤخرًا)
  route_id INTEGER,
  driver_id INTEGER,
  device_key TEXT UNIQUE NOT NULL,
  current_lat REAL,
  current_lng REAL,
  current_speed REAL DEFAULT 0,
  heading REAL DEFAULT 0,
  battery_level INTEGER,
  next_station_id INTEGER,
  current_station_id INTEGER,
  last_gps_at TEXT,
  idle_since TEXT,
  off_route INTEGER DEFAULT 0,
  FOREIGN KEY(route_id) REFERENCES routes(id),
  FOREIGN KEY(driver_id) REFERENCES drivers(id)
);

CREATE TABLE IF NOT EXISTS gps_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_id INTEGER NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  speed REAL,
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS arrivals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_id INTEGER NOT NULL,
  station_id INTEGER NOT NULL,
  arrived_at TEXT NOT NULL,
  scheduled_eta_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_id INTEGER NOT NULL,
  driver_id INTEGER,
  route_id INTEGER,
  started_at TEXT,
  ended_at TEXT,
  status TEXT DEFAULT 'active' -- active | ended
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer', -- super_admin | transport_manager | dispatcher | viewer | driver
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_id INTEGER,
  type TEXT NOT NULL, -- gps_loss | speeding | idle | geofence | incident
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'warning', -- info | warning | critical
  resolved INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS announcements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_ar TEXT NOT NULL,
  message_en TEXT NOT NULL,
  station_scope TEXT DEFAULT 'all', -- 'all' or comma-separated station ids
  duration_seconds INTEGER DEFAULT 30,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS incident_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_id INTEGER,
  driver_id INTEGER,
  type TEXT NOT NULL, -- breakdown | congestion | accident | emergency
  note TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  resolved INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  user_name TEXT,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id INTEGER,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);
// ترقية آمنة لقاعدة بيانات موجودة مسبقًا: إضافة عمود geometry إذا لم يكن موجودًا
try {
  db.exec('ALTER TABLE routes ADD COLUMN geometry TEXT');
} catch (e) {
  // العمود موجود بالفعل — لا حاجة لفعل شيء
}
   try {
     db.exec(`
       CREATE TABLE IF NOT EXISTS buildings (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         name_ar TEXT NOT NULL,
         name_en TEXT NOT NULL,
         lat REAL NOT NULL,
         lng REAL NOT NULL,
         icon TEXT DEFAULT '🏛️',
         color TEXT DEFAULT '#2eb386'
       )
     `);
   } catch (e) {}
module.exports = db;
try {
  db.exec("ALTER TABLE routes ADD COLUMN geometry_source TEXT DEFAULT 'osrm'");
} catch (e) {
  // العمود موجود بالفعل — لا حاجة لفعل شيء
}
try {
  db.exec("ALTER TABLE buses ADD COLUMN color TEXT DEFAULT '#2eb386'");
} catch (e) {
  // العمود موجود بالفعل — لا حاجة لفعل شيء
}
