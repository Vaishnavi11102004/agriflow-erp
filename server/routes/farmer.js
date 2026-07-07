const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validate, validationSchemas, sanitizeInput } = require('../middleware/validation');

const isFarmer = [authMiddleware, requireRole('farmer')];

// GET /api/farmer/profile
router.get('/profile', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM farmer_profiles WHERE user_id = $1', [req.user.id]);
    res.json({ user: req.user, profile: rows[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/farmer/profile
router.patch('/profile', ...isFarmer, validate(validationSchemas.updateFarmerProfile), sanitizeInput, async (req, res) => {
  const {
    name, email, address, acres_of_land, crop_address,
    soil_type, irrigation_type, primary_crop, secondary_crop,
    aadhaar_card_url, bank_passbook_url, land_ownership_url
  } = req.body;
  try {
    if (name || email) {
      await db.query(
        'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = now() WHERE id = $3',
        [name, email, req.user.id]
      );
    }
    await db.query(
      `UPDATE farmer_profiles
       SET address          = COALESCE($1,  address),
           acres_of_land    = COALESCE($2,  acres_of_land),
           crop_address     = COALESCE($3,  crop_address),
           soil_type        = COALESCE($4,  soil_type),
           irrigation_type  = COALESCE($5,  irrigation_type),
           primary_crop     = COALESCE($6,  primary_crop),
           secondary_crop   = COALESCE($7,  secondary_crop),
           aadhaar_card_url    = COALESCE($8,  aadhaar_card_url),
           bank_passbook_url   = COALESCE($9,  bank_passbook_url),
           land_ownership_url  = COALESCE($10, land_ownership_url),
           updated_at       = now()
       WHERE user_id = $11`,
      [address, acres_of_land, crop_address, soil_type, irrigation_type,
       primary_crop, secondary_crop, aadhaar_card_url, bank_passbook_url,
       land_ownership_url, req.user.id]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmer/bank-change-request
router.post('/bank-change-request', ...isFarmer, validate(validationSchemas.bankChangeRequest), sanitizeInput, async (req, res) => {
  const { bank_name, account_number, ifsc_code, upi_id } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO bank_change_requests (farmer_id, bank_name, account_number, ifsc_code, upi_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [req.user.id, bank_name, account_number, ifsc_code, upi_id]
    );
    const requestId = rows[0].id;

    await db.query("UPDATE farmer_profiles SET bank_status = 'pending' WHERE user_id = $1", [req.user.id]);

    const { rows: admins } = await db.query(
      "SELECT id FROM users WHERE role = 'super_admin' AND status = 'active'"
    );
    for (const m of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         VALUES ($1, 'Bank Detail Change', $2, 'warning', 'bank_request', $3)`,
        [m.id, `${req.user.name} has requested bank detail changes.`, requestId]
      );
    }
    res.status(201).json({ message: 'Bank change request submitted for admin approval' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/dashboard
router.get('/dashboard', ...isFarmer, async (req, res) => {
  try {
    const { rows: cropRows } = await db.query(
      "SELECT COUNT(*) as c FROM crops WHERE farmer_id = $1 AND status = 'growing'", [req.user.id]
    );
    const { rows: earnRows } = await db.query(
      "SELECT COALESCE(SUM(amount), 0) as t FROM transactions WHERE farmer_id = $1 AND direction = 'credit' AND status = 'completed'",
      [req.user.id]
    );
    const { rows: spentRows } = await db.query(
      "SELECT COALESCE(SUM(total_amount), 0) as t FROM seed_purchases WHERE farmer_id = $1 AND payment_status = 'paid'",
      [req.user.id]
    );
    const { rows: recentCrops } = await db.query(
      'SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 5', [req.user.id]
    );
    const { rows: recentTx } = await db.query(
      'SELECT * FROM transactions WHERE farmer_id = $1 ORDER BY created_at DESC LIMIT 5', [req.user.id]
    );
    const { rows: visits } = await db.query(
      "SELECT * FROM farm_visits WHERE farmer_id = $1 AND status = 'scheduled' ORDER BY scheduled_date ASC LIMIT 3",
      [req.user.id]
    );
    const { rows: notifications } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 AND is_read = FALSE ORDER BY created_at DESC LIMIT 5',
      [req.user.id]
    );

    res.json({
      crops: parseInt(cropRows[0].c),
      totalEarned: parseFloat(earnRows[0].t),
      totalSpent: parseFloat(spentRows[0].t),
      recentCrops,
      recentTx,
      visits,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/crops
router.get('/crops', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmer/crops
router.post('/crops', ...isFarmer, validate(validationSchemas.createCrop), sanitizeInput, async (req, res) => {
  const { crop_type, acres, sowing_date } = req.body;
  if (!crop_type || !acres || !sowing_date) return res.status(400).json({ error: 'All fields required' });
  try {
    const { rows } = await db.query(
      'INSERT INTO crops (farmer_id, crop_type, acres, sowing_date) VALUES ($1, $2, $3, $4) RETURNING id',
      [req.user.id, crop_type, acres, sowing_date]
    );
    const id = rows[0].id;
    // Auto-schedule visits at month 1 and 3
    await db.query('INSERT INTO farm_visits (crop_id, farmer_id, visit_month) VALUES ($1, $2, 1)', [id, req.user.id]);
    await db.query('INSERT INTO farm_visits (crop_id, farmer_id, visit_month) VALUES ($1, $2, 3)', [id, req.user.id]);
    res.status(201).json({ id, message: 'Crop registered. Farm visits scheduled for month 1 and 3.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/seeds
router.get('/seeds', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM seeds WHERE is_active = TRUE ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmer/seed-purchase
router.post('/seed-purchase', ...isFarmer, validate(validationSchemas.seedPurchase), sanitizeInput, async (req, res) => {
  const { seed_id, quantity_kg, payment_method, upi_id, transaction_id, warehouse_id } = req.body;
  try {
    const { rows: seedRows } = await db.query('SELECT * FROM seeds WHERE id = $1 AND is_active = TRUE', [seed_id]);
    const seed = seedRows[0];
    if (!seed) return res.status(404).json({ error: 'Seed not found' });
    if (parseFloat(seed.stock_kg) < quantity_kg) {
      return res.status(400).json({ error: `Insufficient stock. Available: ${seed.stock_kg} kg` });
    }
    
    let warehouseName = 'the warehouse';
    if (warehouse_id) {
      const { rows: wRows } = await db.query('SELECT name FROM warehouses WHERE id = $1', [warehouse_id]);
      if (wRows.length) warehouseName = wRows[0].name;
    }

    const total = parseFloat(seed.price_per_kg) * quantity_kg;
    const invoice = 'INV-' + Date.now();
    const isWarehouse = payment_method === 'warehouse';

    const { rows: purchaseRows } = await db.query(
      `INSERT INTO seed_purchases
         (farmer_id, seed_id, quantity_kg, price_per_kg, total_amount, upi_id, transaction_id, payment_status, invoice_number)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [req.user.id, seed_id, quantity_kg, seed.price_per_kg, total, 
       isWarehouse ? null : upi_id, 
       isWarehouse ? null : transaction_id, 
       isWarehouse ? 'pending' : 'paid', 
       invoice]
    );
    const purchaseId = purchaseRows[0].id;

    await db.query(
      'UPDATE seeds SET stock_kg = stock_kg - $1, on_hold_kg = COALESCE(on_hold_kg, 0) + $1, updated_at = now() WHERE id = $2',
      [quantity_kg, seed_id]
    );
    
    if (!isWarehouse) {
      await db.query(
        `INSERT INTO transactions
           (reference_type, reference_id, farmer_id, amount, upi_id, transaction_id, direction, status, description, invoice_number)
         VALUES ('seed_purchase', $1, $2, $3, $4, $5, 'debit', 'completed', $6, $7)`,
        [purchaseId, req.user.id, total, upi_id, transaction_id, `Seed purchase: ${seed.name} ${quantity_kg}kg`, invoice]
      );
    } else {
      const { rows: managers } = await db.query(
        "SELECT id FROM users WHERE role IN ('manager', 'super_admin') AND status = 'active'"
      );
      for (const m of managers) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
           VALUES ($1, 'Seed Purchase at Warehouse', $2, 'info', 'seed_purchase', $3)`,
          [m.id, `${req.user.name} selected Pay at Warehouse for ${quantity_kg}kg of ${seed.name} at ${warehouseName}.`, purchaseId]
        );
      }
    }

    res.status(201).json({ id: purchaseId, invoice_number: invoice, total_amount: total, message: 'Purchase successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/seed-purchases
router.get('/seed-purchases', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT sp.*, s.name as seed_name, s.variety
       FROM seed_purchases sp JOIN seeds s ON s.id = sp.seed_id
       WHERE sp.farmer_id = $1 ORDER BY sp.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmer/grain-sale
router.post('/grain-sale', ...isFarmer, validate(validationSchemas.grainSale), sanitizeInput, async (req, res) => {
  const { grain_type, quantity_kg, warehouse_id } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO grain_sales
         (farmer_id, grain_type, grade, raw_material_kg, status)
       VALUES ($1, $2, 'A', $3, 'pending') RETURNING id`,
      [req.user.id, grain_type, quantity_kg]
    );
    const saleId = rows[0].id;

    await db.query(
      `INSERT INTO booking_slots
         (farmer_id, grain_sale_id, booking_date, delivery_address, grain_type, warehouse_id, quantity_kg)
       VALUES ($1, $2, 'TBD', 'TBD', $3, $4, $5)`,
      [req.user.id, saleId, grain_type, warehouse_id, quantity_kg]
    );

    res.status(201).json({ id: saleId, estimated_amount: 0, message: 'Grain sale request submitted. Manager will assign a slot.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/grain-sales
router.get('/grain-sales', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM grain_sales WHERE farmer_id = $1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/warehouses
router.get('/warehouses', ...isFarmer, async (req, res) => {
  try {
    const { rows: warehouses } = await db.query(
      'SELECT id, name, address, total_capacity_kg, current_load_kg FROM warehouses WHERE is_active = TRUE'
    );
    const result = await Promise.all(warehouses.map(async (w) => {
      const { rows: inventory } = await db.query(
        'SELECT * FROM warehouse_inventory WHERE warehouse_id = $1', [w.id]
      );
      return { ...w, available_kg: parseFloat(w.total_capacity_kg) - parseFloat(w.current_load_kg), inventory };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/warehouse-slots
router.get('/warehouse-slots', ...isFarmer, async (req, res) => {
  const { warehouse_id, date } = req.query;
  if (!warehouse_id || !date) return res.status(400).json({ error: 'warehouse_id and date are required' });
  try {
    const { rows } = await db.query(
      `SELECT * FROM warehouse_slots 
       WHERE warehouse_id = $1 AND slot_date = $2 AND status = 'active'
       ORDER BY start_time ASC`,
      [warehouse_id, date]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmer/booking-slot
router.post('/booking-slot', ...isFarmer, validate(validationSchemas.bookingSlot), sanitizeInput, async (req, res) => {
  const { grain_sale_id, booking_date, delivery_address, grain_type, warehouse_id, quantity_kg } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO booking_slots
         (farmer_id, grain_sale_id, warehouse_slot_id, booking_date, delivery_address, grain_type, warehouse_id, quantity_kg)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [req.user.id, grain_sale_id, null, booking_date, delivery_address, grain_type, warehouse_id, quantity_kg]
    );
    const id = rows[0].id;

    // Notify admins
    const { rows: managers } = await db.query(
      "SELECT id FROM users WHERE role IN ('manager','super_admin') AND status = 'active'"
    );
    for (const m of managers) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         VALUES ($1, 'New Delivery Slot Booking', $2, 'info', 'booking_slot', $3)`,
        [m.id, `${req.user.name} booked a delivery for ${quantity_kg}kg of ${grain_type} on ${booking_date}.`, id]
      );
    }
    res.status(201).json({ id, message: 'Booking slot created. Awaiting confirmation.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/booking-slots
router.get('/booking-slots', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT bs.*, w.name as warehouse_name, w.address as warehouse_address
       FROM booking_slots bs JOIN warehouses w ON w.id = bs.warehouse_id
       WHERE bs.farmer_id = $1 ORDER BY bs.booking_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/transactions
router.get('/transactions', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM transactions WHERE farmer_id = $1 ORDER BY created_at DESC', [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/visits
router.get('/visits', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT fv.*, c.crop_type FROM farm_visits fv
       JOIN crops c ON c.id = fv.crop_id
       WHERE fv.farmer_id = $1 ORDER BY fv.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/notifications
router.get('/notifications', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/farmer/notifications/read
router.patch('/notifications/read', ...isFarmer, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmer/market-rates
router.get('/market-rates', ...isFarmer, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM market_rates ORDER BY crop_type, grade');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
