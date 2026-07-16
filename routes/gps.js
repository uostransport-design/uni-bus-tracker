// routes/gps.js — نقطة الاتصال التي يرسل إليها كل جهاز GPS مثبت داخل حافلة موقعه
const express = require('express');
const db = require('../db');
const { ingestLocation } = require('../services/tracking');

module.exports = function (io) {
  const router = express.Router();

  // كل جهاز يرسل: { device_key, lat, lng, speed, heading, battery_level }
  router.post('/gps', (req, res) => {
    const { device_key, lat, lng } = req.body;
    if (!device_key || lat === undefined || lng === undefined) {
      return res.status(400).json({ error: 'device_key و lat و lng مطلوبة' });
    }
    const bus = db.prepare('SELECT * FROM buses WHERE device_key = ?').get(device_key);
    if (!bus) return res.status(404).json({ error: 'جهاز غير مسجّل' });

    const result = ingestLocation(bus, req.body, io);
    res.json({ ok: true, ...result });
  });

  return router;
};
