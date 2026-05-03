const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// ==================== LISTAR BARBEROS APROBADOS ====================
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.avatar_url, u.phone,
             bp.id as profile_id, bp.bio, bp.location,
             bp.does_home_service, bp.home_service_price, bp.banner_url,
             COUNT(DISTINCT ph.id) as photo_count,
             COALESCE(AVG(
               CASE WHEN a.status = 'completed' THEN 5 END
             ), 4.5) as rating
      FROM users u
      JOIN barber_profiles bp ON bp.user_id = u.id
      LEFT JOIN barber_photos ph ON ph.barber_id = bp.id
      LEFT JOIN appointments a ON a.barber_id = bp.id
      WHERE bp.status = 'approved' AND u.is_active = true
      GROUP BY u.id, u.name, u.avatar_url, u.phone, bp.id, bp.bio,
               bp.location, bp.does_home_service, bp.home_service_price, bp.banner_url
      ORDER BY u.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener barberos' });
  }
});

// ==================== PERFIL DE UN BARBERO ====================
router.get('/:barberId', async (req, res) => {
  try {
    const { barberId } = req.params;
    const result = await db.query(`
      SELECT u.id, u.name, u.avatar_url, u.phone,
             bp.id as profile_id, bp.bio, bp.location, bp.banner_url,
             bp.does_home_service, bp.home_service_price, bp.instagram
      FROM users u
      JOIN barber_profiles bp ON bp.user_id = u.id
      WHERE bp.id = $1 AND bp.status = 'approved'
    `, [barberId]);

    if (result.rows.length === 0) return res.status(404).json({ error: 'Barbero no encontrado' });

    const barber = result.rows[0];

    // Fotos
    const photos = await db.query(
      `SELECT id, image_url, caption, likes, created_at FROM barber_photos
       WHERE barber_id = $1 ORDER BY created_at DESC`,
      [barberId]
    );

    // Servicios
    const services = await db.query(
      `SELECT * FROM barber_services WHERE barber_id = $1 ORDER BY price`,
      [barberId]
    );

    // Disponibilidad
    const availability = await db.query(
      `SELECT * FROM barber_availability WHERE barber_id = $1 AND is_active = true ORDER BY day_of_week`,
      [barberId]
    );

    res.json({ ...barber, photos: photos.rows, services: services.rows, availability: availability.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener perfil del barbero' });
  }
});

// ==================== FOTOS PARA EL FEED ====================
router.get('/feed/all', async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;

    const result = await db.query(`
      SELECT ph.id, ph.image_url, ph.caption, ph.likes, ph.created_at,
             u.name as barber_name, u.avatar_url as barber_avatar,
             bp.id as barber_profile_id
      FROM barber_photos ph
      JOIN barber_profiles bp ON bp.id = ph.barber_id
      JOIN users u ON u.id = bp.user_id
      WHERE bp.status = 'approved'
      ORDER BY ph.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener fotos' });
  }
});

// ==================== SLOTS DISPONIBLES ====================
router.get('/:barberId/slots', async (req, res) => {
  try {
    const { barberId, date } = req.query.date ? req.query : { barberId: req.params.barberId, date: req.query.date };
    const targetDate = req.query.date;

    if (!targetDate) return res.status(400).json({ error: 'Fecha requerida' });

    const dateObj = new Date(targetDate);
    const dayOfWeek = dateObj.getDay();

    const availResult = await db.query(
      `SELECT * FROM barber_availability WHERE barber_id = $1 AND day_of_week = $2 AND is_active = true`,
      [req.params.barberId, dayOfWeek]
    );

    if (availResult.rows.length === 0) return res.json({ available: false, slots: [] });

    const avail = availResult.rows[0];
    const [startH, startM] = avail.start_time.split(':').map(Number);
    const [endH, endM] = avail.end_time.split(':').map(Number);
    const slotDuration = avail.slot_duration_minutes || 30;

    // Generar todos los slots
    const slots = [];
    let current = startH * 60 + startM;
    const end = endH * 60 + endM;

    while (current + slotDuration <= end) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += slotDuration;
    }

    // Obtener citas ya agendadas
    const bookedResult = await db.query(
      `SELECT appointment_time FROM appointments
       WHERE barber_id = $1 AND appointment_date = $2
       AND status NOT IN ('cancelled')`,
      [req.params.barberId, targetDate]
    );

    const bookedTimes = bookedResult.rows.map(r =>
      r.appointment_time.substring(0, 5)
    );

    const availableSlots = slots.map(slot => ({
      time: slot,
      available: !bookedTimes.includes(slot),
    }));

    res.json({ available: true, slots: availableSlots });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener horarios' });
  }
});

// ==================== ACTUALIZAR PERFIL DE BARBERO ====================
router.put('/profile/update', auth, requireRole('barber'), async (req, res) => {
  const { bio, location, does_home_service, home_service_price, banner_url, instagram } = req.body;
  try {
    await db.query(`
      UPDATE barber_profiles SET
        bio = COALESCE($1, bio),
        location = COALESCE($2, location),
        does_home_service = COALESCE($3, does_home_service),
        home_service_price = COALESCE($4, home_service_price),
        banner_url = COALESCE($5, banner_url),
        instagram = COALESCE($6, instagram),
        updated_at = NOW()
      WHERE user_id = $7
    `, [bio, location, does_home_service, home_service_price, banner_url, instagram, req.user.id]);
    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ==================== GESTIONAR DISPONIBILIDAD ====================
router.post('/availability', auth, requireRole('barber'), async (req, res) => {
  const { slots } = req.body; // Array de { day_of_week, start_time, end_time, slot_duration_minutes }
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    const barberId = profile.rows[0].id;

    // Desactivar todo primero
    await db.query('UPDATE barber_availability SET is_active = false WHERE barber_id = $1', [barberId]);

    // Insertar/actualizar slots
    for (const slot of slots) {
      await db.query(`
        INSERT INTO barber_availability (barber_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
        VALUES ($1, $2, $3, $4, $5, true)
        ON CONFLICT (barber_id, day_of_week)
        DO UPDATE SET start_time = $3, end_time = $4, slot_duration_minutes = $5, is_active = true
      `, [barberId, slot.day_of_week, slot.start_time, slot.end_time, slot.slot_duration_minutes || 30]);
    }

    res.json({ message: 'Disponibilidad actualizada' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar disponibilidad' });
  }
});

// ==================== GESTIONAR SERVICIOS ====================
router.post('/services', auth, requireRole('barber'), async (req, res) => {
  const { name, price, duration_minutes, description } = req.body;
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    const barberId = profile.rows[0].id;

    const result = await db.query(
      `INSERT INTO barber_services (barber_id, name, price, duration_minutes, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [barberId, name, price, duration_minutes || 30, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear servicio' });
  }
});

router.delete('/services/:serviceId', auth, requireRole('barber'), async (req, res) => {
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    await db.query(
      'DELETE FROM barber_services WHERE id = $1 AND barber_id = $2',
      [req.params.serviceId, profile.rows[0].id]
    );
    res.json({ message: 'Servicio eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar servicio' });
  }
});

module.exports = router;
