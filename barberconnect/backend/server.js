require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== PING ENDPOINT (Keep-Alive 24/7) ====================
// UptimeRobot hace GET a esta ruta cada 5 min -> Render nunca duerme
app.get('/ping', (req, res) => {
  res.status(200).json({ status: 'alive', timestamp: new Date().toISOString() });
});

// ==================== RUTAS API ====================
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/barbers',       require('./routes/barbers'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/photos',        require('./routes/photos'));
app.use('/api/loyalty',       require('./routes/loyalty'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bot',           require('./routes/bot'));

// Health check extendido
app.get('/health', (req, res) => res.json({
  status: 'OK',
  timestamp: new Date(),
  uptime_seconds: Math.floor(process.uptime()),
  env: process.env.NODE_ENV || 'development',
}));

// ==================== CRON JOBS ====================
const { sendReminders } = require('./services/reminderService');

// Recordatorios de citas cada hora
cron.schedule('0 * * * *', async () => {
  console.log('Ejecutando recordatorios automaticos...');
  await sendReminders();
});

// Auto-ping propio cada 14 minutos (Render duerme a los 15)
// Actua como respaldo si UptimeRobot falla o hay retraso
if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
  cron.schedule('*/14 * * * *', async () => {
    try {
      await axios.get(process.env.BACKEND_URL + '/ping', { timeout: 10000 });
      console.log('Self-ping OK -', new Date().toISOString());
    } catch (err) {
      console.warn('Self-ping fallo:', err.message);
    }
  });
  console.log('Auto-ping interno activado (cada 14 min)');
}

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('BarberConnect API corriendo en puerto ' + PORT);
  console.log('Keep-alive endpoint: GET /ping');
});

module.exports = app;
