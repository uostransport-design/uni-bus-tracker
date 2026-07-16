// middleware/audit.js — تسجيل كل عملية إدارية في سجل التدقيق (Audit Log)
const db = require('../db');

function logAction(user, action, entity, entityId, details) {
  try {
    db.prepare(
      `INSERT INTO audit_logs (user_id, user_name, action, entity, entity_id, details) VALUES (?,?,?,?,?,?)`
    ).run(user?.id || null, user?.name || 'system', action, entity || null, entityId || null, details ? JSON.stringify(details) : null);
  } catch (e) {
    console.error('audit log failed:', e.message);
  }
}

module.exports = { logAction };
