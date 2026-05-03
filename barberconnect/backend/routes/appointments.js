const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { sendAppointmentNotification } = require('../services/whatsappService');

// ==================== CREAR CITA ====================
router.post('/', auth, requireRole('client'), async (req, res) => {
  const { barber_id, service_id, appointment_date, appointment_time, is_home_service, client_address, notes } = req.body;

  try {
    // VALIDAR DOBLE RESERVA - Verificar si el slot ya está ocupado
    const existingAppt = await db.query(`
      SELECT id FROM appointments
      WHERE barber_id = $1
        AND appointment_date = $2
        AND appointment_time = $3
        AND status NOT IN ('cancelled')
    `, [barber_id, appointment_date, appointment_time]);

    if (existingAppt.rows.length > 0) {
      return res.status(409).json({ error: 'Este horario ya está reservado. Por favor selecciona otro.' });
    }

    // Verificar que el barbero tiene disponibilidad ese día
    const dateObj = new Date(appointment_date);
    const dayOfWeek = dateObj.getDay();

    const avail = await db.query(
      `SELECT * FROM barber_availability WHERE barber_id = $1 AND day_of_week = $2 AND is_active = true`,
      [barber_id, dayOfWeek]
    );

    if (avail.rows.length === 0) {
      return res.status(400).json({ error: 'El barbero no está disponible ese día' });
    }

    // Obtener duración del servicio
    let duration = 30;
    if (service_id) {
      const svc = await db.query('SELECT duration_minutes FROM barber_services WHERE id = $1', [service_id]);
      if (svc.rows.length > 0) duration = svc.rows[0].duration_minutes;
    }

    // Crear la cita
    const result = await db.query(`
      INSERT INTO appointments
        (client_id, barber_id, service_id, appointment_date, appointment_time,
         duration_minutes, is_home_service, client_address, notes, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
      RETURNING *
    `, [req.user.id, barber_id, service_id, appointment_date, appointment_time,
        duration, is_home_service || false, client_address, notes]);

    const appointment = result.rows[0];

    // Actualizar contador de visitas de fidelidad
    await db.query(`
      INSERT INTO client_loyalty (client_id, barber_id, visit_count, last_visit)
      VALUES ($1, $2, 0, $3)
      ON CONFLICT (client_id, barber_id) DO NOTHING
    `, [req.user.id, barber_id, appointment_date]);

    // Obtener datos para notificación WhatsApp
    const barberData = await db.query(`
      SELECT u.name as barber_name, u.phone as barber_phone,
             c.name as client_name
      FROM barber_profiles bp
      JOIN users u ON u.id = bp.user_id
      CROSS JOIN users c
      WHERE bp.id = $1 AND c.id = $2
    `, [barber_id, req.user.id]);

    if (barberData.rows.length > 0) {
      const { barber_name, barber_phone, client_name } = barberData.rows[0];
      // Enviar notificación WhatsApp al barbero (async, no bloquea respuesta)
      sendAppointmentNotification({
        barberPhone: barber_phone,
        barberName: barber_name,
        clientName: client_name,
        date: appointment_date,
        time: appointment_time,
        appointmentId: appointment.id,
        isHomeService: is_home_service,
        clientAddress: client_address,
        notes,
      }).catch(err => console.error('Error enviando WA:', err));
    }

    res.status(201).json({ message: 'Cita agendada exitosamente', appointment });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este horario ya está reservado' });
    }
    console.error(err);
    res.status(500).json({ error: 'Error al agendar cita' });
  }
});

// ==================== MIS CITAS (CLIENTE) ====================
router.get('/my', auth, async (req, res) => {
  try {
    let query, params;

    if (req.user.role === 'client') {
      query = `
        SELECT a.*, u.name as barber_name, u.avatar_url as barber_avatar,
               bp.location, bs.name as service_name, bs.price
        FROM appointments a
        JOIN barber_profiles bp ON bp.id = a.barber_id
        JOIN users u ON u.id = bp.user_id
        LEFT JOIN barber_services bs ON bs.id = a.service_id
        WHERE a.client_id = $1
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
      params = [req.user.id];
    } else if (req.user.role === 'barber') {
      const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
      query = `
        SELECT a.*, u.name as client_name, u.phone as client_phone,
               u.avatar_url as client_avatar, bs.name as service_name, bs.price
        FROM appointments a
        JOIN users u ON u.id = a.client_id
        LEFT JOIN barber_services bs ON bs.id = a.service_id
        WHERE a.barber_id = $1
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `;
      params = [profile.rows[0].id];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener citas' });
  }
});

// ==================== BARBERO: ACTUALIZAR ESTADO DE CITA ====================
router.patch('/:id/status', auth, requireRole('barber', 'admin'), async (req, res) => {
  const { status, barber_comment } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'completed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado inválido' });
  }

  try {
    // Verificar que la cita pertenece al barbero
    if (req.user.role === 'barber') {
      const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
      const appt = await db.query(
        'SELECT id FROM appointments WHERE id = $1 AND barber_id = $2',
        [req.params.id, profile.rows[0].id]
      );
      if (appt.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes permiso para modificar esta cita' });
      }
    }

    await db.query(
      `UPDATE appointments SET status = $1, barber_comment = COALESCE($2, barber_comment), updated_at = NOW()
       WHERE id = $3`,
      [status, barber_comment, req.params.id]
    );

    // Si se completa la cita, incrementar contador fidelidad
    if (status === 'completed') {
      const appt = await db.query('SELECT client_id, barber_id FROM appointments WHERE id = $1', [req.params.id]);
      if (appt.rows.length > 0) {
        const { client_id, barber_id } = appt.rows[0];
        await db.query(`
          UPDATE client_loyalty
          SET visit_count = visit_count + 1, last_visit = CURRENT_DATE
          WHERE client_id = $1 AND barber_id = $2
        `, [client_id, barber_id]);
      }
    }

    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar cita' });
  }
});

// ==================== CITAS DE HOY (BARBERO) ====================
router.get('/today', auth, requireRole('barber'), async (req, res) => {
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    const result = await db.query(`
      SELECT a.*, u.name as client_name, u.phone as client_phone,
             bs.name as service_name, bs.price
      FROM appointments a
      JOIN users u ON u.id = a.client_id
      LEFT JOIN barber_services bs ON bs.id = a.service_id
      WHERE a.barber_id = $1
        AND a.appointment_date = CURRENT_DATE
        AND a.status NOT IN ('cancelled')
      ORDER BY a.appointment_time
    `, [profile.rows[0].id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
