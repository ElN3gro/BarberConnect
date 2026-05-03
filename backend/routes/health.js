// routes/health.js
// Endpoint que responde rápido para los pings de UptimeRobot
const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
  try {
    // Verificar conexión a la DB también
    await db.query('SELECT 1');
    res.json({
      status: 'OK',
      app: 'BarberConnect API',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()) + 's',
    });
  } catch (err) {
    res.status(503).json({ status: 'ERROR', error: 'DB no disponible' });
  }
});

module.exports = router;
