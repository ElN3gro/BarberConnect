const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');
const { sendBarberApprovalNotification } = require('../services/whatsappService');

const adminOnly = [auth, requireRole('admin')];

// ==================== BARBEROS PENDIENTES ====================
router.get('/barbers/pending', ...adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.created_at,
             bp.id as profile_id, bp.status, bp.bio, bp.location
      FROM users u
      JOIN barber_profiles bp ON bp.user_id = u.id
      WHERE bp.status = 'pending'
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ==================== APROBAR / RECHAZAR BARBERO ====================
router.patch('/barbers/:profileId/approve', ...adminOnly, async (req, res) => {
  const { action, rejection_reason } = req.body;
  try {
    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await db.query(`
      UPDATE barber_profiles SET
        status = $1,
        rejection_reason = $2,
        approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
        approved_by = $3
      WHERE id = $4
    `, [newStatus, rejection_reason, req.user.id, req.params.profileId]);

    // Intentar enviar WhatsApp pero sin bloquear si falla
    try {
      const barberData = await db.query(`
        SELECT u.name, u.phone FROM barber_profiles bp
        JOIN users u ON u.id = bp.user_id WHERE bp.id = $1
      `, [req.params.profileId]);

      if (barberData.rows.length > 0) {
        const { name, phone } = barberData.rows[0];
        await sendBarberApprovalNotification({
          barberPhone: phone,
          barberName: name,
          approved: action === 'approve',
          rejection_reason
        });
      }
    } catch (waError) {
      console.error('WhatsApp notification failed (non-critical):', waError.message);
    }

    res.json({ message: `Barbero ${action === 'approve' ? 'aprobado' : 'rechazado'}` });
  } catch (err) {
    console.error('Error aprobando barbero:', err);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});
// ==================== TODOS LOS USUARIOS ====================
router.get('/users', ...adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.phone, u.is_active, u.created_at,
             bp.status as barber_status
      FROM users u
      LEFT JOIN barber_profiles bp ON bp.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ==================== ACTIVAR / DESACTIVAR USUARIO ====================
router.patch('/users/:userId/toggle', ...adminOnly, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET is_active = NOT is_active WHERE id = $1 AND role != \'admin\'',
      [req.params.userId]
    );
    res.json({ message: 'Estado actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ==================== TODAS LAS CITAS ====================
router.get('/appointments', ...adminOnly, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, c.name as client_name, b.name as barber_name,
             bs.name as service_name
      FROM appointments a
      JOIN users c ON c.id = a.client_id
      JOIN barber_profiles bp ON bp.id = a.barber_id
      JOIN users b ON b.id = bp.user_id
      LEFT JOIN barber_services bs ON bs.id = a.service_id
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      LIMIT 100
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ==================== ESTADÍSTICAS ====================
router.get('/stats', ...adminOnly, async (req, res) => {
  try {
    const [users, barbers, appointments, pending] = await Promise.all([
      db.query('SELECT COUNT(*) FROM users WHERE role = \'client\''),
      db.query('SELECT COUNT(*) FROM barber_profiles WHERE status = \'approved\''),
      db.query('SELECT COUNT(*) FROM appointments WHERE status != \'cancelled\''),
      db.query('SELECT COUNT(*) FROM barber_profiles WHERE status = \'pending\''),
    ]);

    const monthlyAppts = await db.query(`
      SELECT DATE_TRUNC('month', appointment_date) as month, COUNT(*) as count
      FROM appointments
      WHERE appointment_date >= NOW() - INTERVAL '6 months'
      GROUP BY 1 ORDER BY 1
    `);

    res.json({
      total_clients: parseInt(users.rows[0].count),
      total_barbers: parseInt(barbers.rows[0].count),
      total_appointments: parseInt(appointments.rows[0].count),
      pending_barbers: parseInt(pending.rows[0].count),
      monthly_appointments: monthlyAppts.rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
