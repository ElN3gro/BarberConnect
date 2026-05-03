const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../db');
const { auth } = require('../middleware/auth');

// ==================== REGISTRO ====================
router.post('/register',
  [
    body('name').trim().notEmpty().withMessage('Nombre requerido'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').isLength({ min: 6 }).withMessage('Contraseña mínimo 6 caracteres'),
    body('role').isIn(['client', 'barber']).withMessage('Rol inválido'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, email, password, role, phone } = req.body;

    try {
      const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }

      if (role === 'barber' && !phone) {
        return res.status(400).json({ error: 'Los barberos deben indicar su número de teléfono' });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const result = await db.query(
        `INSERT INTO users (name, email, password, role, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, phone`,
        [name, email, hashedPassword, role, phone || null]
      );

      const user = result.rows[0];

      if (role === 'barber') {
        await db.query(
          `INSERT INTO barber_profiles (user_id, status) VALUES ($1, 'pending')`,
          [user.id]
        );
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.status(201).json({
        message: role === 'barber'
          ? 'Registro exitoso. Tu cuenta está pendiente de aprobación por el administrador. Te contactaremos por WhatsApp.'
          : 'Registro exitoso',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al registrar usuario' });
    }
  }
);

// ==================== LOGIN ====================
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;

    try {
      const result = await db.query(
        `SELECT u.*, bp.status as barber_status, bp.id as barber_profile_id
         FROM users u
         LEFT JOIN barber_profiles bp ON bp.user_id = u.id
         WHERE u.email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ error: 'Credenciales incorrectas' });
      }

      const user = result.rows[0];

      if (!user.is_active) {
        return res.status(403).json({ error: 'Tu cuenta está desactivada' });
      }

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        return res.status(400).json({ error: 'Credenciales incorrectas' });
      }

      if (user.role === 'barber' && user.barber_status === 'pending') {
        return res.status(403).json({
          error: 'Tu cuenta está pendiente de aprobación. El administrador te contactará por WhatsApp.',
          status: 'pending',
        });
      }

      if (user.role === 'barber' && user.barber_status === 'rejected') {
        return res.status(403).json({
          error: `Tu solicitud fue rechazada. Razón: ${user.rejection_reason || 'No especificada'}`,
          status: 'rejected',
        });
      }

      const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      });

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar_url: user.avatar_url,
          barber_profile_id: user.barber_profile_id,
        },
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  }
);

// ==================== PERFIL ACTUAL ====================
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar_url, u.created_at,
              bp.id as barber_profile_id, bp.status as barber_status, bp.bio,
              bp.location, bp.does_home_service, bp.home_service_price, bp.banner_url
       FROM users u
       LEFT JOIN barber_profiles bp ON bp.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ==================== ACTUALIZAR PERFIL ====================
router.put('/profile', auth, async (req, res) => {
  const { name, phone, avatar_url } = req.body;
  try {
    await db.query(
      `UPDATE users SET name = COALESCE($1, name), phone = COALESCE($2, phone),
       avatar_url = COALESCE($3, avatar_url), updated_at = NOW() WHERE id = $4`,
      [name, phone, avatar_url, req.user.id]
    );
    res.json({ message: 'Perfil actualizado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

module.exports = router;
