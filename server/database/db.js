if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL is not set in server/.env');
  console.error('    Please add your Supabase connection string and restart.');
  throw new Error('DATABASE_URL is missing. Please add it to Netlify Environment Variables.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required for Supabase
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err);
});

// ─── Query helper ──────────────────────────────────────────────────────────────
// Usage:  const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV !== 'production' && duration > 500) {
      console.warn(`⚠️  Slow query (${duration}ms):`, text);
    }
    return res;
  } catch (err) {
    console.error('DB query error:', err.message, '\nSQL:', text, '\nParams:', params);
    throw err;
  }
}

// ─── Schema initialisation (idempotent) ────────────────────────────────────────
async function initializeDatabase() {
  console.log('🔌 Connecting to Supabase...');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            BIGSERIAL PRIMARY KEY,
      name          TEXT      NOT NULL,
      email         TEXT      UNIQUE,
      phone         TEXT      UNIQUE NOT NULL,
      password_hash TEXT      NOT NULL,
      role          TEXT      NOT NULL CHECK (role IN ('farmer', 'manager', 'super_admin')),
      status        TEXT      NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
      first_login   BOOLEAN   DEFAULT TRUE,
      otp           TEXT,
      otp_expires   BIGINT,
      created_at    TIMESTAMPTZ DEFAULT now(),
      updated_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS farmer_profiles (
      id                  BIGSERIAL PRIMARY KEY,
      user_id             BIGINT    NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
      address             TEXT,
      acres_of_land       NUMERIC   DEFAULT 0,
      crop_address        TEXT,
      bank_name           TEXT,
      account_number      TEXT,
      ifsc_code           TEXT,
      upi_id              TEXT,
      bank_status         TEXT      DEFAULT 'approved'
                                    CHECK (bank_status IN ('pending', 'approved', 'rejected')),
      profile_photo       TEXT,
      soil_type           VARCHAR(80),
      irrigation_type     VARCHAR(80),
      primary_crop        VARCHAR(100),
      secondary_crop      VARCHAR(100),
      aadhaar_card_url    TEXT,
      bank_passbook_url   TEXT,
      land_ownership_url  TEXT,
      created_at          TIMESTAMPTZ DEFAULT now(),
      updated_at          TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS admin_profiles (
      id              BIGSERIAL PRIMARY KEY,
      user_id         BIGINT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
      department      TEXT,
      assigned_region TEXT,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS crops (
      id            BIGSERIAL PRIMARY KEY,
      farmer_id     BIGINT    NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      crop_type     TEXT      NOT NULL,
      acres         NUMERIC   NOT NULL,
      sowing_date   TEXT      NOT NULL,
      harvest_date  TEXT,
      status        TEXT      DEFAULT 'growing'
                              CHECK (status IN ('growing', 'harvested', 'failed', 'sold')),
      current_month INTEGER   DEFAULT 1,
      notes         TEXT,
      created_at    TIMESTAMPTZ DEFAULT now(),
      updated_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS farm_visits (
      id              BIGSERIAL PRIMARY KEY,
      crop_id         BIGINT   NOT NULL REFERENCES crops (id) ON DELETE CASCADE,
      farmer_id       BIGINT   NOT NULL REFERENCES users (id),
      admin_id        BIGINT   REFERENCES users (id),
      visit_month     INTEGER  NOT NULL CHECK (visit_month IN (1, 3)),
      scheduled_date  TEXT,
      actual_date     TEXT,
      status          TEXT     DEFAULT 'scheduled'
                               CHECK (status IN ('scheduled', 'pending', 'completed', 'cancelled')),
      verified_acres  NUMERIC,
      report          TEXT,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS seeds (
      id            BIGSERIAL PRIMARY KEY,
      name          TEXT    NOT NULL,
      variety       TEXT,
      price_per_kg  NUMERIC NOT NULL,
      stock_kg      NUMERIC NOT NULL DEFAULT 0,
      description   TEXT,
      image_url     TEXT,
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMPTZ DEFAULT now(),
      updated_at    TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS seed_purchases (
      id              BIGSERIAL PRIMARY KEY,
      farmer_id       BIGINT  NOT NULL REFERENCES users (id),
      seed_id         BIGINT  NOT NULL REFERENCES seeds (id),
      quantity_kg     NUMERIC NOT NULL,
      price_per_kg    NUMERIC NOT NULL,
      total_amount    NUMERIC NOT NULL,
      upi_id          TEXT,
      transaction_id  TEXT,
      payment_status  TEXT    DEFAULT 'pending'
                              CHECK (payment_status IN ('pending', 'paid', 'failed')),
      invoice_number  TEXT    UNIQUE,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS warehouses (
      id                BIGSERIAL PRIMARY KEY,
      name              TEXT    NOT NULL,
      address           TEXT    NOT NULL,
      total_capacity_kg NUMERIC NOT NULL,
      current_load_kg   NUMERIC DEFAULT 0,
      manager_id        BIGINT  REFERENCES users (id),
      is_active         BOOLEAN DEFAULT TRUE,
      created_at        TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS warehouse_inventory (
      id            BIGSERIAL PRIMARY KEY,
      warehouse_id  BIGINT  NOT NULL REFERENCES warehouses (id),
      grain_type    TEXT    NOT NULL,
      quantity_kg   NUMERIC DEFAULT 0,
      last_updated  TIMESTAMPTZ DEFAULT now(),
      UNIQUE (warehouse_id, grain_type)
    );

    CREATE TABLE IF NOT EXISTS grain_sales (
      id               BIGSERIAL PRIMARY KEY,
      farmer_id        BIGINT  NOT NULL REFERENCES users (id),
      crop_id          BIGINT  REFERENCES crops (id),
      grain_type       TEXT    NOT NULL,
      grade            TEXT    NOT NULL CHECK (grade IN ('A', 'B', 'C')),
      raw_material_kg  NUMERIC DEFAULT 0,
      wastage_kg       NUMERIC DEFAULT 0,
      good_material_kg NUMERIC DEFAULT 0,
      price_per_kg     NUMERIC,
      total_amount     NUMERIC DEFAULT 0,
      status           TEXT    DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected', 'received', 'paid')),
      created_at       TIMESTAMPTZ DEFAULT now(),
      updated_at       TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS booking_slots (
      id               BIGSERIAL PRIMARY KEY,
      farmer_id        BIGINT  NOT NULL REFERENCES users (id),
      grain_sale_id    BIGINT  REFERENCES grain_sales (id),
      warehouse_slot_id BIGINT,
      booking_date     TEXT    NOT NULL,
      delivery_address TEXT    NOT NULL,
      grain_type       TEXT    NOT NULL,
      warehouse_id     BIGINT  NOT NULL REFERENCES warehouses (id),
      quantity_kg      NUMERIC NOT NULL,
      status           TEXT    DEFAULT 'pending'
                               CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
      notes            TEXT,
      created_at       TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id              BIGSERIAL PRIMARY KEY,
      reference_type  TEXT    NOT NULL CHECK (reference_type IN ('seed_purchase', 'grain_sale', 'other')),
      reference_id    BIGINT,
      farmer_id       BIGINT  REFERENCES users (id),
      amount          NUMERIC NOT NULL,
      upi_id          TEXT,
      transaction_id  TEXT,
      direction       TEXT    NOT NULL CHECK (direction IN ('credit', 'debit')),
      status          TEXT    DEFAULT 'pending'
                              CHECK (status IN ('pending', 'completed', 'failed')),
      description     TEXT,
      invoice_number  TEXT,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS bank_change_requests (
      id              BIGSERIAL PRIMARY KEY,
      farmer_id       BIGINT NOT NULL REFERENCES users (id),
      bank_name       TEXT,
      account_number  TEXT,
      ifsc_code       TEXT,
      upi_id          TEXT,
      status          TEXT   DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected')),
      admin_notes     TEXT,
      requested_at    TIMESTAMPTZ DEFAULT now(),
      reviewed_at     TIMESTAMPTZ,
      reviewed_by     BIGINT REFERENCES users (id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id              BIGSERIAL PRIMARY KEY,
      user_id         BIGINT NOT NULL REFERENCES users (id),
      title           TEXT   NOT NULL,
      message         TEXT   NOT NULL,
      type            TEXT   DEFAULT 'info'
                             CHECK (type IN ('info', 'success', 'warning', 'error')),
      is_read         BOOLEAN DEFAULT FALSE,
      reference_type  TEXT,
      reference_id    BIGINT,
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id          BIGSERIAL PRIMARY KEY,
      user_id     BIGINT REFERENCES users (id),
      action      TEXT   NOT NULL,
      entity_type TEXT,
      entity_id   BIGINT,
      details     TEXT,
      ip_address  TEXT,
      created_at  TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS market_rates (
      id              BIGSERIAL PRIMARY KEY,
      crop_type       TEXT    NOT NULL,
      grade           TEXT    NOT NULL CHECK (grade IN ('A', 'B', 'C')),
      price_per_kg    NUMERIC NOT NULL,
      effective_date  TEXT    NOT NULL,
      set_by          BIGINT  REFERENCES users (id),
      created_at      TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS warehouse_slots (
      id                 BIGSERIAL PRIMARY KEY,
      warehouse_id       BIGINT NOT NULL REFERENCES warehouses (id),
      slot_date          TEXT NOT NULL,
      start_time         TEXT NOT NULL,
      end_time           TEXT NOT NULL,
      total_capacity_kg  NUMERIC NOT NULL,
      booked_capacity_kg NUMERIC DEFAULT 0,
      status             TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
      created_at         TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS crop_inspections (
      id                  BIGSERIAL PRIMARY KEY,
      booking_slot_id     BIGINT    NOT NULL REFERENCES booking_slots (id) ON DELETE CASCADE,
      grain_sale_id       BIGINT    REFERENCES grain_sales (id) ON DELETE SET NULL,
      inspector_id        BIGINT    NOT NULL REFERENCES users (id),
      good_quantity_kg    NUMERIC   NOT NULL,
      bad_quantity_kg     NUMERIC   NOT NULL,
      rejection_reason    TEXT,
      notes               TEXT,
      created_at          TIMESTAMPTZ DEFAULT now()
    );
  `);

  try {
    await pool.query('ALTER TABLE booking_slots ADD COLUMN IF NOT EXISTS warehouse_slot_id BIGINT REFERENCES warehouse_slots(id);');
  } catch (e) {
    console.warn('Could not add warehouse_slot_id to booking_slots:', e.message);
  }

  console.log('Database initialized successfully');
      
  // Drop the visit_month constraint to allow manual farm visits for any month
  try {
    await pool.query('ALTER TABLE farm_visits DROP CONSTRAINT IF EXISTS farm_visits_visit_month_check');
    console.log('Dropped visit_month constraint on farm_visits table');
  } catch (e) {
    console.warn('Could not drop visit_month constraint:', e.message);
  }

  // Drop status constraint on booking_slots to allow custom status strings
  try {
    await pool.query('ALTER TABLE booking_slots DROP CONSTRAINT IF EXISTS booking_slots_status_check');
    console.log('Dropped status constraint on booking_slots table');
  } catch (e) {
    console.warn('Could not drop booking_slots status constraint:', e.message);
  }

  // Drop status constraint on grain_sales to allow 'received' status
  try {
    await pool.query('ALTER TABLE grain_sales DROP CONSTRAINT IF EXISTS grain_sales_status_check');
    console.log('Dropped status constraint on grain_sales table');
  } catch (e) {
    console.warn('Could not drop grain_sales status constraint:', e.message);
  }

  console.log('✅ Schema initialised');
  await seedInitialData();
}

// ─── Seed initial data ─────────────────────────────────────────────────────────
async function seedInitialData() {
  // Super Admin
  const { rows: saRows } = await pool.query("SELECT id FROM users WHERE role = 'super_admin' LIMIT 1");
  if (saRows.length === 0) {
    const hash = bcrypt.hashSync('Admin@123', 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status, first_login)
       VALUES ($1, $2, $3, $4, 'super_admin', 'active', TRUE) RETURNING id`,
      ['Super Admin', 'superadmin@agroseq.com', '9999999999', hash]
    );
    console.log('✅ Super Admin created: phone=9999999999, password=Admin@123 (must change on first login)');
  }

  // Manager
  const { rows: mgrRows } = await pool.query("SELECT id FROM users WHERE role = 'manager' LIMIT 1");
  if (mgrRows.length === 0) {
    const hash = bcrypt.hashSync('Manager@123', 10);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status, first_login)
       VALUES ($1, $2, $3, $4, 'manager', 'active', FALSE) RETURNING id`,
      ['District Manager', 'manager@agroseq.com', '8888888888', hash]
    );
    const managerId = rows[0].id;
    await pool.query(`INSERT INTO admin_profiles (user_id, department) VALUES ($1, $2)`, [managerId, 'Agriculture']);
    console.log('✅ Manager created: phone=8888888888, password=Manager@123');
  }

  // Warehouses
  const { rows: wRows } = await pool.query('SELECT COUNT(*) as c FROM warehouses');
  if (parseInt(wRows[0].c) === 0) {
    const { rows: w1Rows } = await pool.query(
      `INSERT INTO warehouses (name, address, total_capacity_kg) VALUES ($1, $2, $3) RETURNING id`,
      ['Central Warehouse A', 'NH-65, Hyderabad, Telangana', 500000]
    );
    const { rows: w2Rows } = await pool.query(
      `INSERT INTO warehouses (name, address, total_capacity_kg) VALUES ($1, $2, $3) RETURNING id`,
      ['Regional Warehouse B', 'NH-44, Warangal, Telangana', 300000]
    );
    const w1 = w1Rows[0].id;
    const w2 = w2Rows[0].id;
    const grains = ['Rice', 'Wheat', 'Maize', 'Cotton', 'Soybean'];
    for (const g of grains) {
      await pool.query(`INSERT INTO warehouse_inventory (warehouse_id, grain_type, quantity_kg) VALUES ($1, $2, 0)`, [w1, g]);
      await pool.query(`INSERT INTO warehouse_inventory (warehouse_id, grain_type, quantity_kg) VALUES ($1, $2, 0)`, [w2, g]);
    }
    console.log('✅ Warehouses seeded');
  }

  // Seeds
  const { rows: sRows } = await pool.query('SELECT COUNT(*) as c FROM seeds');
  if (parseInt(sRows[0].c) === 0) {
    const seeds = [
      ['IR-36 Rice', 'High Yield', 45, 5000, 'Premium paddy seeds with high yield potential', 'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=400&q=80'],
      ['HD-2967 Wheat', 'Rust Resistant', 38, 3000, 'Disease resistant wheat variety', 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80'],
      ['DHM-117 Maize', 'Hybrid', 55, 2000, 'Hybrid maize with 30% higher yield', 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=400&q=80'],
      ['LRA-5166 Cotton', 'Long Staple', 120, 1500, 'Long staple cotton for premium fiber', 'https://images.unsplash.com/photo-1605000797499-95a51c5269ae?w=400&q=80'],
      ['JS-335 Soybean', 'Early Maturing', 62, 2500, 'Fast maturing soybean variety', 'https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=400&q=80'],
      ['TDN-58 Groundnut', 'High Oil', 85, 1800, 'High oil content groundnut', 'https://images.unsplash.com/photo-1567892336374-39993db3b52f?w=400&q=80'],
      ['CO-5 Sugarcane', 'Disease Free', 25, 4000, 'High sucrose content sugarcane', 'https://images.unsplash.com/photo-1594735933504-7a8536f2c0d1?w=400&q=80'],
    ];
    for (const s of seeds) {
      await pool.query(
        `INSERT INTO seeds (name, variety, price_per_kg, stock_kg, description, image_url) VALUES ($1, $2, $3, $4, $5, $6)`,
        s
      );
    }
    console.log('✅ Seeds seeded');
  }

  // Market rates
  const { rows: mrRows } = await pool.query('SELECT COUNT(*) as c FROM market_rates');
  if (parseInt(mrRows[0].c) === 0) {
    const today = new Date().toISOString().split('T')[0];
    const rates = [
      ['Rice', 'A', 22.5], ['Rice', 'B', 19.0], ['Rice', 'C', 15.0],
      ['Wheat', 'A', 21.0], ['Wheat', 'B', 18.5], ['Wheat', 'C', 14.0],
      ['Maize', 'A', 18.0], ['Maize', 'B', 15.5], ['Maize', 'C', 12.0],
      ['Cotton', 'A', 65.0], ['Cotton', 'B', 55.0], ['Cotton', 'C', 45.0],
      ['Soybean', 'A', 42.0], ['Soybean', 'B', 36.0], ['Soybean', 'C', 28.0],
      ['Jowar', 'A', 20.0], ['Jowar', 'B', 17.0], ['Jowar', 'C', 13.0],
    ];
    for (const r of rates) {
      await pool.query(
        `INSERT INTO market_rates (crop_type, grade, price_per_kg, effective_date) VALUES ($1, $2, $3, $4)`,
        [...r, today]
      );
    }
    console.log('✅ Market rates seeded');
  }
}

// Boot-time init (Only run in development to avoid serverless timeouts)
if (process.env.NODE_ENV !== 'production') {
  initializeDatabase().catch((err) => {
    console.error('❌ Database initialisation failed:', err.message);
    console.error('Full error:', err);
  });
}

module.exports = { query, pool };
