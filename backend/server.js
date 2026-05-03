require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');

const app = express();

// ==================== MIDDLEWARE ====================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==================== RUTAS ====================
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/barbers',       require('./routes/barbers'));
app.use('/api/appointments',  require('./routes/appointments'));
app.use('/api/photos',        require('./routes/photos'));
app.use('/api/loyalty',       require('./routes/loyalty'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/bot',           require('./routes/bot'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// ==================== CRON JOBS (BOT) ====================
const { sendReminders } = require('./services/reminderService');

// Ejecutar recordatorios cada hora
cron.schedule('0 * * * *', async () => {
  console.log('⏰ Ejecutando recordatorios automáticos...');
  await sendReminders();
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 BarberConnect API corriendo en puerto ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
