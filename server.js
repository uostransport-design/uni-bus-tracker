// server.js — نقطة تشغيل المنصة: REST API + Socket.io (بث لحظي) + تقديم الصفحات + مهام دورية
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const db = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// رابط خاص لكل محطة: /station/1 أو /station/12 يعرض نفس صفحة العرض العامة
// وتقوم الصفحة بقراءة رقم المحطة من الرابط وتصفية الحافلات القادمة إليها فقط
app.get('/station/:id', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'display.html'));
});

app.use('/api', require('./routes/gps')(io));       // POST /api/gps            (أجهزة GPS)
app.use('/api/driver', require('./routes/driver')(io)); // مسارات تطبيق السائق
app.use('/api', require('./routes/api'));            // القراءة العامة (شاشات العرض)
app.use('/api/auth', require('./routes/auth'));      // تسجيل الدخول
app.use('/api/admin', require('./routes/admin'));    // لوحة الإدارة (محمية)

io.on('connection', (socket) => console.log('شاشة/لوحة متصلة:', socket.id));

/* ---------------- مهمة دورية: كشف انقطاع GPS وتحديث حالة الاتصال ---------------- */
const GPS_TIMEOUT_MS = 60 * 1000; // اعتبار الحافلة غير متصلة بعد 60 ثانية بدون إشارة

setInterval(() => {
  const buses = db.prepare("SELECT * FROM buses WHERE connectivity='online'").all();
  const now = Date.now();
  buses.forEach((b) => {
    if (!b.last_gps_at) return;
    const age = now - new Date(b.last_gps_at).getTime();
    if (age > GPS_TIMEOUT_MS) {
      db.prepare("UPDATE buses SET connectivity='offline' WHERE id=?").run(b.id);
      const recent = db.prepare(
        `SELECT id FROM alerts WHERE bus_id=? AND type='gps_loss' AND resolved=0 AND created_at >= datetime('now','-10 minutes')`
      ).get(b.id);
      if (!recent) {
        db.prepare('INSERT INTO alerts (bus_id, type, message, severity) VALUES (?,?,?,?)')
          .run(b.id, 'gps_loss', `${b.name} فقدت إشارة GPS`, 'critical');
      }
      io.emit('bus:offline', { busId: b.id });
    }
  });
}, 15000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ منصة تتبع حافلات جامعة الشارقة تعمل على http://localhost:${PORT}`);
});
