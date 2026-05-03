const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// ==================== CREAR TARJETA DE FIDELIDAD ====================
router.post('/', auth, requireRole('barber'), async (req, res) => {
  const { name, required_visits, reward_type, reward_value, description } = req.body;
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    const result = await db.query(`
      INSERT INTO loyalty_cards (barber_id, name, required_visits, reward_type, reward_value, description)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [profile.rows[0].id, name, required_visits, reward_type, reward_value, description]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al crear tarjeta' });
  }
});

// ==================== MIS TARJETAS (BARBERO) ====================
router.get('/my', auth, requireRole('barber'), async (req, res) => {
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    const result = await db.query(
      'SELECT * FROM loyalty_cards WHERE barber_id = $1 ORDER BY required_visits',
      [profile.rows[0].id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ==================== TARJETAS DE UN BARBERO (CLIENTE VE) ====================
router.get('/barber/:barberId', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM loyalty_cards WHERE barber_id = $1 AND is_active = true ORDER BY required_visits',
      [req.params.barberId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ==================== PROGRESO DEL CLIENTE ====================
router.get('/progress/:barberId', auth, requireRole('client'), async (req, res) => {
  try {
    const progress = await db.query(`
      SELECT cl.*, lc.name as card_name, lc.required_visits, lc.reward_type,
             lc.reward_value, lc.description
      FROM client_loyalty cl
      LEFT JOIN loyalty_cards lc ON lc.id = cl.loyalty_card_id
      WHERE cl.client_id = $1 AND cl.barber_id = $2
    `, [req.user.id, req.params.barberId]);

    if (progress.rows.length === 0) {
      return res.json({ visit_count: 0, rewards_redeemed: 0 });
    }
    res.json(progress.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

// ==================== ACTUALIZAR / ELIMINAR TARJETA ====================
router.put('/:id', auth, requireRole('barber'), async (req, res) => {
  const { name, required_visits, reward_type, reward_value, description, is_active } = req.body;
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    await db.query(`
      UPDATE loyalty_cards SET
        name = COALESCE($1, name),
        required_visits = COALESCE($2, required_visits),
        reward_type = COALESCE($3, reward_type),
        reward_value = COALESCE($4, reward_value),
        description = COALESCE($5, description),
        is_active = COALESCE($6, is_active)
      WHERE id = $7 AND barber_id = $8
    `, [name, required_visits, reward_type, reward_value, description, is_active, req.params.id, profile.rows[0].id]);
    res.json({ message: 'Tarjeta actualizada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar tarjeta' });
  }
});

module.exports = router;
