// routes/auth.js — تسجيل دخول الموظفين والسائقين، إصدار توكن JWT
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, JWT_SECRET, SESSION_HOURS, rateLimit, checkAccountLock, recordFailedLogin, clearFailedLogins } = require('../middleware/auth');
const { logAction } = require('../middleware/audit');

const router = express.Router();

router.post('/login', rateLimit({ windowMs: 60000, max: 10 }), (req, res) => {
  const { email, password, loginContext } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'البريد وكلمة المرور مطلوبان' });
  const normalizedEmail = email.trim().toLowerCase();

  // حماية إضافية: قفل مؤقت للحساب المستهدف نفسه بعد 5 محاولات فاشلة خلال 15 دقيقة،
  // بغض النظر عن عنوان IP المستخدم (يمنع التحايل بتبديل الشبكة/VPN)
  if (checkAccountLock(normalizedEmail)) {
    return res.status(429).json({ error: 'تم إيقاف الدخول لهذا الحساب مؤقتًا بسبب محاولات فاشلة متكررة. حاول بعد 15 دقيقة.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (!user) {
    recordFailedLogin(normalizedEmail);
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    recordFailedLogin(normalizedEmail);
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }

   // كل صفحة دخول مخصصة لنوع حساب معيّن — نرفض أي تطابق غير صحيح قبل إصدار أي توكن
  if (loginContext === 'staff' && user.role === 'driver') {
    return res.status(403).json({ error: 'هذا الحساب مخصص لتطبيق السائق. الرجاء الدخول من صفحة السائقين.' });
  }
  if (loginContext === 'driver' && user.role !== 'driver') {
    return res.status(403).json({ error: 'هذا الحساب مخصص لصفحة الموظفين. الرجاء الدخول من هناك.' });
  }
  clearFailedLogins(normalizedEmail);

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: SESSION_HOURS + 'h' }
  );

  logAction(user, 'login', 'user', user.id);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'كلمة المرور الحالية غير صحيحة' });
  }
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.user.id);
  logAction(req.user, 'change_password', 'user', req.user.id);
  res.json({ ok: true });
});

module.exports = router;
