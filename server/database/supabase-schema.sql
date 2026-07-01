-- ============================================================
--  AgroSeq — Supabase / PostgreSQL Schema
--  Run in Supabase SQL Editor, or applied automatically by
--  server/database/db.js on first startup.
-- ============================================================

-- Users table (all roles)
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

-- Farmer profiles
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

-- Manager / Admin profiles
CREATE TABLE IF NOT EXISTS admin_profiles (
  id              BIGSERIAL PRIMARY KEY,
  user_id         BIGINT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  department      TEXT,
  assigned_region TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Crops registered by farmers
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

-- Farm visit reports
CREATE TABLE IF NOT EXISTS farm_visits (
  id              BIGSERIAL PRIMARY KEY,
  crop_id         BIGINT   NOT NULL REFERENCES crops (id) ON DELETE CASCADE,
  farmer_id       BIGINT   NOT NULL REFERENCES users (id),
  admin_id        BIGINT   REFERENCES users (id),
  visit_month     INTEGER  NOT NULL CHECK (visit_month IN (1, 3)),
  scheduled_date  TEXT,
  actual_date     TEXT,
  status          TEXT     DEFAULT 'scheduled'
                           CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  verified_acres  NUMERIC,
  report          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Seeds inventory (admin managed)
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

-- Seed purchases by farmers
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

-- Warehouses
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

-- Warehouse inventory per grain type
CREATE TABLE IF NOT EXISTS warehouse_inventory (
  id            BIGSERIAL PRIMARY KEY,
  warehouse_id  BIGINT  NOT NULL REFERENCES warehouses (id),
  grain_type    TEXT    NOT NULL,
  quantity_kg   NUMERIC DEFAULT 0,
  last_updated  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (warehouse_id, grain_type)
);

-- Grain sales submitted by farmers
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
                           CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Booking slots for grain delivery
CREATE TABLE IF NOT EXISTS booking_slots (
  id               BIGSERIAL PRIMARY KEY,
  farmer_id        BIGINT  NOT NULL REFERENCES users (id),
  grain_sale_id    BIGINT  REFERENCES grain_sales (id),
  warehouse_slot_id BIGINT REFERENCES warehouse_slots (id),
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

-- Time slots for warehouse booking
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

-- All financial transactions
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

-- Bank detail change requests
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

-- Notifications
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

-- Audit logs
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

-- Crop market rates
CREATE TABLE IF NOT EXISTS market_rates (
  id              BIGSERIAL PRIMARY KEY,
  crop_type       TEXT    NOT NULL,
  grade           TEXT    NOT NULL CHECK (grade IN ('A', 'B', 'C')),
  price_per_kg    NUMERIC NOT NULL,
  effective_date  TEXT    NOT NULL,
  set_by          BIGINT  REFERENCES users (id),
  created_at      TIMESTAMPTZ DEFAULT now()
);
