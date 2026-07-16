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

module.exports = { requireAuth, requireRole, rateLimit, JWT_SECRET, SESSION_HOURS };
