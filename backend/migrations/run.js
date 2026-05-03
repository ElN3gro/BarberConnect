const db = require('../db');
const bcrypt = require('bcryptjs');

async function runMigrations() {
  console.log('🔄 Ejecutando migraciones...');

  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'barber', 'admin')),
      phone VARCHAR(20),
      avatar_url TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS barber_profiles (
      id SERIAL PRIMARY KEY,
      user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      banner_url TEXT,
      bio TEXT,
      location VARCHAR(255),
      does_home_service BOOLEAN DEFAULT false,
      home_service_price DECIMAL(10,2),
      instagram VARCHAR(100),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      rejection_reason TEXT,
      approved_at TIMESTAMP,
      approved_by INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS barber_services (
      id SERIAL PRIMARY KEY,
      barber_id INT REFERENCES barber_profiles(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      duration_minutes INT DEFAULT 30,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS barber_availability (
      id SERIAL PRIMARY KEY,
      barber_id INT REFERENCES barber_profiles(id) ON DELETE CASCADE,
      day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      slot_duration_minutes INT DEFAULT 30,
      is_active BOOLEAN DEFAULT true,
      UNIQUE(barber_id, day_of_week)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES users(id) ON DELETE SET NULL,
      barber_id INT REFERENCES barber_profiles(id) ON DELETE SET NULL,
      service_id INT REFERENCES barber_services(id) ON DELETE SET NULL,
      appointment_date DATE NOT NULL,
      appointment_time TIME NOT NULL,
      duration_minutes INT DEFAULT 30,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
      is_home_service BOOLEAN DEFAULT false,
      client_address TEXT,
      notes TEXT,
      barber_comment TEXT,
      reminder_sent BOOLEAN DEFAULT false,
      reminder_24h_sent BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(barber_id, appointment_date, appointment_time)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS barber_photos (
      id SERIAL PRIMARY KEY,
      barber_id INT REFERENCES barber_profiles(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      caption TEXT,
      likes INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS photo_likes (
      id SERIAL PRIMARY KEY,
      photo_id INT REFERENCES barber_photos(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(photo_id, user_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS loyalty_cards (
      id SERIAL PRIMARY KEY,
      barber_id INT REFERENCES barber_profiles(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      required_visits INT NOT NULL,
      reward_type VARCHAR(50) NOT NULL CHECK (reward_type IN (
        'free_haircut', 'discount', 'priority', 'free_eyebrows',
        'free_design', 'free_beard', 'eyebrow_discount', 'beard_discount', 'design_discount'
      )),
      reward_value DECIMAL(10,2),
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS client_loyalty (
      id SERIAL PRIMARY KEY,
      client_id INT REFERENCES users(id) ON DELETE CASCADE,
      barber_id INT REFERENCES barber_profiles(id) ON DELETE CASCADE,
      loyalty_card_id INT REFERENCES loyalty_cards(id) ON DELETE SET NULL,
      visit_count INT DEFAULT 0,
      rewards_redeemed INT DEFAULT 0,
      last_visit DATE,
      UNIQUE(client_id, barber_id)
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT false,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Crear índices para performance
  await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_barber_date ON appointments(barber_id, appointment_date);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(client_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_barber_photos_barber ON barber_photos(barber_id);`);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);`);

  // Crear admin por defecto
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@barberconnect.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';
  const existingAdmin = await db.query('SELECT id FROM users WHERE email = $1', [adminEmail]);

  if (existingAdmin.rows.length === 0) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await db.query(
      `INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, 'admin')`,
      ['Administrador', adminEmail, hashedPassword]
    );
    console.log(`✅ Admin creado: ${adminEmail} / ${adminPassword}`);
  }

  console.log('✅ Migraciones completadas');
}

runMigrations()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error en migraciones:', err);
    process.exit(1);
  });
