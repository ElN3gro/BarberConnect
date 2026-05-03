const db = require('../db');
const { sendReminderToBarber } = require('./whatsappService');

async function sendReminders() {
  try {
    // Buscar citas en las próximas 24 horas que NO hayan recibido recordatorio
    const upcoming24h = await db.query(`
      SELECT a.id, a.appointment_date, a.appointment_time, a.reminder_24h_sent,
             u_barber.name as barber_name, u_barber.phone as barber_phone,
             u_client.name as client_name
      FROM appointments a
      JOIN barber_profiles bp ON bp.id = a.barber_id
      JOIN users u_barber ON u_barber.id = bp.user_id
      JOIN users u_client ON u_client.id = a.client_id
      WHERE a.status IN ('pending', 'confirmed')
        AND a.reminder_24h_sent = false
        AND (a.appointment_date + a.appointment_time::time) BETWEEN
            NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
    `);

    for (const appt of upcoming24h.rows) {
      await sendReminderToBarber({
        barberPhone: appt.barber_phone,
        barberName: appt.barber_name,
        clientName: appt.client_name,
        date: appt.appointment_date,
        time: appt.appointment_time.substring(0, 5),
        appointmentId: appt.id,
        hoursUntil: 24,
      });

      await db.query(
        'UPDATE appointments SET reminder_24h_sent = true WHERE id = $1',
        [appt.id]
      );

      console.log(`✅ Recordatorio 24h enviado para cita #${appt.id}`);
    }

    // Recordatorio 1 hora antes
    const upcoming1h = await db.query(`
      SELECT a.id, a.appointment_date, a.appointment_time, a.reminder_sent,
             u_barber.name as barber_name, u_barber.phone as barber_phone,
             u_client.name as client_name
      FROM appointments a
      JOIN barber_profiles bp ON bp.id = a.barber_id
      JOIN users u_barber ON u_barber.id = bp.user_id
      JOIN users u_client ON u_client.id = a.client_id
      WHERE a.status IN ('pending', 'confirmed')
        AND a.reminder_sent = false
        AND (a.appointment_date + a.appointment_time::time) BETWEEN
            NOW() + INTERVAL '55 minutes' AND NOW() + INTERVAL '65 minutes'
    `);

    for (const appt of upcoming1h.rows) {
      await sendReminderToBarber({
        barberPhone: appt.barber_phone,
        barberName: appt.barber_name,
        clientName: appt.client_name,
        date: appt.appointment_date,
        time: appt.appointment_time.substring(0, 5),
        appointmentId: appt.id,
        hoursUntil: 1,
      });

      await db.query(
        'UPDATE appointments SET reminder_sent = true WHERE id = $1',
        [appt.id]
      );

      console.log(`✅ Recordatorio 1h enviado para cita #${appt.id}`);
    }
  } catch (err) {
    console.error('❌ Error en recordatorios:', err);
  }
}

module.exports = { sendReminders };
