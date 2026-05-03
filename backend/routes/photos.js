const express = require('express');
const router = express.Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// ==================== SUBIR FOTO (URL desde Cloudinary frontend) ====================
router.post('/', auth, requireRole('barber'), async (req, res) => {
  const { image_url, caption } = req.body;

  if (!image_url) return res.status(400).json({ error: 'URL de imagen requerida' });

  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    if (profile.rows.length === 0) return res.status(404).json({ error: 'Perfil no encontrado' });

    const result = await db.query(
      `INSERT INTO barber_photos (barber_id, image_url, caption) VALUES ($1, $2, $3) RETURNING *`,
      [profile.rows[0].id, image_url, caption]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar foto' });
  }
});

// ==================== ELIMINAR FOTO ====================
router.delete('/:photoId', auth, requireRole('barber'), async (req, res) => {
  try {
    const profile = await db.query('SELECT id FROM barber_profiles WHERE user_id = $1', [req.user.id]);
    await db.query(
      'DELETE FROM barber_photos WHERE id = $1 AND barber_id = $2',
      [req.params.photoId, profile.rows[0].id]
    );
    res.json({ message: 'Foto eliminada' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar foto' });
  }
});

// ==================== DAR LIKE A FOTO ====================
router.post('/:photoId/like', auth, async (req, res) => {
  try {
    const existing = await db.query(
      'SELECT id FROM photo_likes WHERE photo_id = $1 AND user_id = $2',
      [req.params.photoId, req.user.id]
    );

    if (existing.rows.length > 0) {
      await db.query('DELETE FROM photo_likes WHERE photo_id = $1 AND user_id = $2',
        [req.params.photoId, req.user.id]);
      await db.query('UPDATE barber_photos SET likes = likes - 1 WHERE id = $1', [req.params.photoId]);
      return res.json({ liked: false });
    }

    await db.query('INSERT INTO photo_likes (photo_id, user_id) VALUES ($1, $2)',
      [req.params.photoId, req.user.id]);
    await db.query('UPDATE barber_photos SET likes = likes + 1 WHERE id = $1', [req.params.photoId]);
    res.json({ liked: true });
  } catch (err) {
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
