// middleware/auth.js — التحقق من توكن JWT، تقييد الوصول حسب الدور، وتحديد معدل الطلبات
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const SESSION_HOURS = 12; // إنهاء الجلسة تلقائيًا بعد هذه المدة

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، سجّل الدخول من جديد' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'يجب تسجيل الدخول' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'لا تملك صلاحية القيام بهذا الإجراء' });
    }
    next();
  };
}

// حماية بسيطة من الطلبات المتكررة (Rate limiting) بدون حزمة خارجية
const hits = new Map(); // key -> [timestamps]

// تنظيف دوري للذاكرة: نحذف كل مفتاح ما استُخدم بآخر ساعة، حتى لا تتراكم الذاكرة للأبد
setInterval(() => {
  const now = Date.now();
  for (const [key, arr] of hits.entries()) {
    const fresh = arr.filter((t) => now - t < 3600000);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }
}, 300000); // كل 5 دقائق

function rateLimit({ windowMs = 60000, max = 30 } = {}) {
  return (req, res, next) => {
    const key = req.ip + ':' + req.path;
    const now = Date.now();
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    arr.push(now);
    hits.set(key, arr);
    if (arr.length > max) return res.status(429).json({ error: 'طلبات كثيرة جدًا، حاول لاحقًا' });
    next();
  };
}

// حماية إضافية خاصة بتسجيل الدخول: تحدّ المحاولات حسب البريد الإلكتروني المستهدف نفسه،
// بغض النظر عن عنوان IP المستخدم — تمنع محاولة استهداف حساب واحد من عدة أجهزة/شبكات مختلفة
const loginAttemptsByEmail = new Map(); // email -> [timestamps فاشلة]
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60000; // 15 دقيقة

function checkAccountLock(email) {
  const now = Date.now();
  const arr = (loginAttemptsByEmail.get(email) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  loginAttemptsByEmail.set(email, arr);
  return arr.length >= LOGIN_MAX_ATTEMPTS;
}
function recordFailedLogin(email) {
  const now = Date.now();
  const arr = (loginAttemptsByEmail.get(email) || []).filter((t) => now - t < LOGIN_WINDOW_MS);
  arr.push(now);
  loginAttemptsByEmail.set(email, arr);
}
function clearFailedLogins(email) {
  loginAttemptsByEmail.delete(email);
}

setInterval(() => {
  const now = Date.now();
  for (const [email, arr] of loginAttemptsByEmail.entries()) {
    const fresh = arr.filter((t) => now - t < LOGIN_WINDOW_MS);
    if (fresh.length === 0) loginAttemptsByEmail.delete(email);
    else loginAttemptsByEmail.set(email, fresh);
  }
}, 300000);

module.exports = { requireAuth, requireRole, rateLimit, JWT_SECRET, SESSION_HOURS, checkAccountLock, recordFailedLogin, clearFailedLogins };
