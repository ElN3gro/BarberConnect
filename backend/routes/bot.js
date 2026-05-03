const express = require('express');
const router = express.Router();
const db = require('../db');
const { handleIncomingMessage } = require('../services/whatsappService');

// ==================== VERIFICACIÓN DE WEBHOOK (Meta) ====================
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ Webhook de WhatsApp verificado');
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
});

// ==================== RECIBIR MENSAJES ====================
router.post('/webhook', async (req, res) => {
  try {
    const body = req.body;

    if (body.object !== 'whatsapp_business_account') {
      return res.sendStatus(404);
    }

    // Responder 200 inmediatamente para que Meta no reintente
    res.sendStatus(200);

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return;

    const message = messages[0];
    const from = message.from; // número del remitente
    const messageType = message.type;

    let messageText = '';
    if (messageType === 'text') {
      messageText = message.text?.body || '';
    } else if (messageType === 'interactive') {
      messageText = message.interactive?.button_reply?.id ||
                    message.interactive?.list_reply?.id || '';
    }

    if (messageText) {
      await handleIncomingMessage(from, messageText, db);
    }
  } catch (err) {
    console.error('Error en webhook WA:', err);
  }
});

// ==================== TEST DEL BOT (solo desarrollo) ====================
router.post('/test', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'No disponible en producción' });
  }
  const { phone, message } = req.body;
  try {
    await handleIncomingMessage(phone, message, db);
    res.json({ message: 'Mensaje procesado (simulado)' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
