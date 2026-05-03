const axios = require('axios');

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const API_URL = `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://barberconnect.onrender.com';

// ==================== FUNCIÓN BASE: ENVIAR MENSAJE ====================
async function sendWhatsAppMessage(to, body) {
  if (!WA_TOKEN || !PHONE_ID) {
    console.log(`[BOT SIMULADO] Para: +${to}\nMensaje: ${body}`);
    return;
  }

  // Formatear número: quitar + si lo tiene
  const phone = to.replace(/\D/g, '');

  try {
    await axios.post(API_URL, {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'text',
      text: { body },
    }, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    console.log(`✅ WA enviado a ${phone}`);
  } catch (err) {
    console.error('❌ Error enviando WA:', err.response?.data || err.message);
  }
}

// ==================== NOTIFICACIÓN DE NUEVA CITA AL BARBERO ====================
async function sendAppointmentNotification({
  barberPhone, barberName, clientName,
  date, time, appointmentId,
  isHomeService, clientAddress, notes
}) {
  if (!barberPhone) return;

  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  let message = `✂️ *BarberConnect - Nueva Cita*\n\n`;
  message += `Hola ${barberName}! 👋\n`;
  message += `📅 *Fecha:* ${dateFormatted}\n`;
  message += `⏰ *Hora:* ${time}\n`;
  message += `👤 *Cliente:* ${clientName}\n`;

  if (isHomeService && clientAddress) {
    message += `🏠 *A domicilio:* ${clientAddress}\n`;
  }

  if (notes) {
    message += `📝 *Notas:* ${notes}\n`;
  }

  message += `\n*Responde al bot para gestionar la cita:*\n`;
  message += `✅ Escribe: *CONFIRMAR ${appointmentId}*\n`;
  message += `❌ Escribe: *CANCELAR ${appointmentId}*\n`;
  message += `\n🔗 Ver panel: ${FRONTEND_URL}/dashboard`;

  await sendWhatsAppMessage(barberPhone, message);
}

// ==================== RECORDATORIO AL BARBERO ====================
async function sendReminderToBarber({
  barberPhone, barberName, clientName,
  date, time, appointmentId, hoursUntil
}) {
  if (!barberPhone) return;

  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString('es-CR', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  let message = `⏰ *BarberConnect - Recordatorio*\n\n`;
  message += `Hola ${barberName}! Tienes una cita en ${hoursUntil} hora(s):\n\n`;
  message += `📅 ${dateFormatted} a las ${time}\n`;
  message += `👤 Cliente: ${clientName}\n\n`;
  message += `Si necesitas cancelar:\n`;
  message += `❌ Escribe: *CANCELAR ${appointmentId}*`;

  await sendWhatsAppMessage(barberPhone, message);
}

// ==================== APROBACIÓN DE BARBERO ====================
async function sendBarberApprovalNotification({ barberPhone, barberName, approved, rejection_reason }) {
  if (!barberPhone) return;

  let message;
  if (approved) {
    message = `🎉 *BarberConnect - ¡Cuenta Aprobada!*\n\n`;
    message += `Hola ${barberName}! Tu cuenta de barbero ha sido *aprobada*.\n\n`;
    message += `✅ Ya puedes iniciar sesión en:\n${FRONTEND_URL}\n\n`;
    message += `Configura tu perfil, disponibilidad y servicios para que los clientes te encuentren.`;
  } else {
    message = `❌ *BarberConnect - Solicitud No Aprobada*\n\n`;
    message += `Hola ${barberName}, lamentablemente tu solicitud no fue aprobada.\n\n`;
    if (rejection_reason) message += `*Razón:* ${rejection_reason}\n\n`;
    message += `Si crees que es un error, contacta al administrador.`;
  }

  await sendWhatsAppMessage(barberPhone, message);
}

// ==================== BOT: RESPUESTA A CLIENTES ====================
async function handleIncomingMessage(from, messageText, db) {
  const text = messageText.trim().toUpperCase();

  // Comandos del barbero
  if (text.startsWith('CONFIRMAR ')) {
    const apptId = parseInt(text.split(' ')[1]);
    if (apptId) {
      try {
        const result = await db.query(
          `UPDATE appointments SET status = 'confirmed' WHERE id = $1 RETURNING *`,
          [apptId]
        );
        if (result.rows.length > 0) {
          await sendWhatsAppMessage(from, `✅ Cita #${apptId} *confirmada* exitosamente.\n\nEl cliente ha sido notificado.`);
          return;
        }
      } catch (e) { console.error(e); }
    }
    await sendWhatsAppMessage(from, `❌ No se encontró la cita #${apptId}.`);
    return;
  }

  if (text.startsWith('CANCELAR ')) {
    const parts = text.split(' ');
    const apptId = parseInt(parts[1]);
    const comment = parts.slice(2).join(' ') || '';

    if (apptId) {
      try {
        await db.query(
          `UPDATE appointments SET status = 'cancelled', barber_comment = $1 WHERE id = $2`,
          [comment || 'Cancelado por el barbero', apptId]
        );
        await sendWhatsAppMessage(from, `❌ Cita #${apptId} *cancelada*.\n\nEl cliente ha sido notificado.`);
        return;
      } catch (e) { console.error(e); }
    }
    await sendWhatsAppMessage(from, `❌ No se encontró la cita #${apptId}.`);
    return;
  }

  // Respuesta para clientes desconocidos
  let response = `✂️ *Bienvenido a BarberConnect!* 💈\n\n`;
  response += `Soy el asistente virtual de BarberConnect.\n\n`;
  response += `Para agendar una cita con tu barbero favorito, visita nuestra plataforma:\n`;
  response += `🔗 *${FRONTEND_URL}*\n\n`;
  response += `Ahí podrás:\n`;
  response += `• Ver todos los barberos disponibles 👨‍🦱\n`;
  response += `• Ver fotos de sus cortes 📸\n`;
  response += `• Agendar tu cita en minutos ⚡\n\n`;
  response += `_BarberConnect - Tu barbería, siempre disponible_`;

  await sendWhatsAppMessage(from, response);
}

module.exports = {
  sendWhatsAppMessage,
  sendAppointmentNotification,
  sendReminderToBarber,
  sendBarberApprovalNotification,
  handleIncomingMessage,
};
