const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { validate, validationSchemas, sanitizeInput } = require('../middleware/validation');

const isAdmin = [authMiddleware, requireRole('manager', 'super_admin')];

// GET /api/admin/dashboard
router.get('/dashboard', ...isAdmin, async (req, res) => {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const today = new Date().toISOString().slice(0, 10);       // YYYY-MM-DD

    const { rows: r1 } = await db.query("SELECT COUNT(*) as c FROM users WHERE role = 'farmer'");
    const totalFarmers = parseInt(r1[0].c);

    const { rows: r2 } = await db.query("SELECT COUNT(*) as c FROM users WHERE role = 'farmer' AND status = 'active'");
    const activeFarmers = parseInt(r2[0].c);

    const { rows: r3 } = await db.query(`
      SELECT COALESCE(SUM(good_material_kg), 0) as total
      FROM grain_sales
      WHERE status = 'approved'
        AND TO_CHAR(updated_at AT TIME ZONE 'UTC', 'YYYY-MM') = $1
    `, [currentMonth]);
    const procurementMTD = parseFloat(r3[0].total);

    const { rows: r4 } = await db.query("SELECT COALESCE(SUM(current_load_kg), 0) as total FROM warehouses");
    const warehouseInv = parseFloat(r4[0].total);

    const { rows: r5 } = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM seed_purchases
      WHERE payment_status = 'paid'
        AND TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM') = $1
    `, [currentMonth]);
    const revenueMTD = parseFloat(r5[0].total);

    const { rows: r6 } = await db.query(`
      SELECT COALESCE(SUM(total_amount), 0) as total
      FROM grain_sales
      WHERE status = 'paid'
        AND TO_CHAR(updated_at AT TIME ZONE 'UTC', 'YYYY-MM') = $1
    `, [currentMonth]);
    const procurementCostMTD = parseFloat(r6[0].total);

    const profitMTD = revenueMTD - procurementCostMTD;

    const { rows: r7 } = await db.query("SELECT COUNT(*) as c FROM transactions WHERE status = 'pending'");
    const pendingPayments = parseInt(r7[0].c);

    const { rows: r8 } = await db.query("SELECT COUNT(*) as c FROM crops WHERE status = 'growing'");
    const activeCrops = parseInt(r8[0].c);

    const { rows: r9 } = await db.query("SELECT COUNT(*) as c FROM farm_visits WHERE scheduled_date = $1", [today]);
    const visitorToday = parseInt(r9[0].c);

    const { rows: r10 } = await db.query("SELECT COUNT(*) as c FROM users WHERE role = 'farmer' AND status = 'pending'");
    const pendingFarmersCount = parseInt(r10[0].c);

    const { rows: warehouses } = await db.query(
      'SELECT id, name, total_capacity_kg, current_load_kg FROM warehouses'
    );

    const { rows: recentTx } = await db.query(`
      SELECT t.*, u.name as farmer_name FROM transactions t
      LEFT JOIN users u ON u.id = t.farmer_id
      ORDER BY t.created_at DESC LIMIT 10
    `);

    const { rows: monthlySales } = await db.query(`
      SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM') as month,
             SUM(total_amount) as total
      FROM seed_purchases WHERE payment_status = 'paid'
      GROUP BY month ORDER BY month DESC LIMIT 12
    `);

    const { rows: marketRates } = await db.query(
      'SELECT crop_type, grade, price_per_kg FROM market_rates ORDER BY crop_type, grade'
    );

    res.json({
      totalFarmers, activeFarmers, procurementMTD, warehouseInv,
      revenueMTD, profitMTD, pendingPayments, activeCrops, visitorToday,
      pendingFarmers: pendingFarmersCount, totalRevenue: revenueMTD,
      warehouses, recentTx, monthlySales, marketRates,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/farmers
router.get('/farmers', ...isAdmin, async (req, res) => {
  const { status, search } = req.query;
  try {
    let sql = `
      SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at,
             u.updated_at as verified_at,
             fp.address, fp.acres_of_land, fp.crop_address, fp.bank_status
      FROM users u LEFT JOIN farmer_profiles fp ON fp.user_id = u.id
      WHERE u.role = 'farmer'
    `;
    const params = [];
    if (status) {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      sql += ` AND (u.name ILIKE $${params.length} OR u.phone ILIKE $${params.length})`;
    }
    sql += ' ORDER BY u.created_at DESC';
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/farmers/:id
router.get('/farmers/:id', ...isAdmin, async (req, res) => {
  try {
    const { rows: farmerRows } = await db.query(
      `SELECT u.*, fp.* FROM users u
       LEFT JOIN farmer_profiles fp ON fp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'farmer'`,
      [req.params.id]
    );
    if (farmerRows.length === 0) return res.status(404).json({ error: 'Farmer not found' });

    const { rows: crops } = await db.query(
      'SELECT * FROM crops WHERE farmer_id = $1 ORDER BY created_at DESC', [req.params.id]
    );
    const { rows: transactions } = await db.query(
      'SELECT * FROM transactions WHERE farmer_id = $1 ORDER BY created_at DESC', [req.params.id]
    );
    const { rows: visits } = await db.query(
      'SELECT * FROM farm_visits WHERE farmer_id = $1 ORDER BY created_at DESC', [req.params.id]
    );
    const { rows: grainSales } = await db.query(
      'SELECT * FROM grain_sales WHERE farmer_id = $1 ORDER BY created_at DESC', [req.params.id]
    );
    res.json({ farmer: farmerRows[0], crops, transactions, visits, grainSales });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/farmers/:id/approve
router.patch('/farmers/:id/approve', ...isAdmin, validate(validationSchemas.updateFarmerStatus), sanitizeInput, async (req, res) => {
  const { status, notes } = req.body;
  if (!['active', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await db.query(
      "UPDATE users SET status = $1, updated_at = now() WHERE id = $2 AND role = 'farmer'",
      [status, req.params.id]
    );
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [
        req.params.id,
        status === 'active' ? 'Registration Approved!' : 'Registration Rejected',
        status === 'active' ? 'Your account has been approved. You can now login.'
                            : `Your registration was rejected. ${notes || ''}`,
        status === 'active' ? 'success' : 'error',
      ]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'farmer', $3, $4, $5)`,
      [req.user.id, status === 'active' ? 'Confirm Registration' : 'Reject Registration', req.params.id, status === 'active' ? 'Approved farmer registration' : `Rejected farmer registration. ${notes || ''}`, req.ip || req.connection?.remoteAddress]
    );
    // Mark notification as read globally
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE reference_type = 'farmer' AND reference_id = $1",
      [req.params.id]
    );
    res.json({ message: 'Farmer status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/bank-requests
router.get('/bank-requests', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT bcr.*, u.name as farmer_name, u.phone FROM bank_change_requests bcr
      JOIN users u ON u.id = bcr.farmer_id
      WHERE bcr.status = 'pending' ORDER BY bcr.requested_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/bank-requests/:id
router.patch('/bank-requests/:id', authMiddleware, requireRole('super_admin'), validate(validationSchemas.updateBankRequest), sanitizeInput, async (req, res) => {
  const { status, notes } = req.body;
  try {
    const { rows: reqRows } = await db.query('SELECT * FROM bank_change_requests WHERE id = $1', [req.params.id]);
    if (reqRows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const req_rec = reqRows[0];

    await db.query(
      `UPDATE bank_change_requests SET status = $1, admin_notes = $2, reviewed_at = now(), reviewed_by = $3 WHERE id = $4`,
      [status, notes || '', req.user.id, req.params.id]
    );

    if (status === 'approved') {
      await db.query(
        `UPDATE farmer_profiles
         SET bank_name = $1, account_number = $2, ifsc_code = $3, upi_id = $4,
             bank_status = 'approved', updated_at = now()
         WHERE user_id = $5`,
        [req_rec.bank_name, req_rec.account_number, req_rec.ifsc_code, req_rec.upi_id, req_rec.farmer_id]
      );
    }

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [req_rec.farmer_id, `Bank Details ${status}`,
       `Your bank detail change request has been ${status}.`,
       status === 'approved' ? 'success' : 'error']
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'bank_request', $3, $4, $5)`,
      [req.user.id, status === 'approved' ? 'Approve Bank Details' : 'Reject Bank Details', req.params.id, `Manager ${status} bank detail change for farmer ${req_rec.farmer_id}`, req.ip || req.connection?.remoteAddress]
    );
    // Mark notification as read globally
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE reference_type = 'bank_request' AND reference_id = $1",
      [req.params.id]
    );
    res.json({ message: `Bank request ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/seeds
router.get('/seeds', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM seeds ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/seeds
router.post('/seeds', ...isAdmin, validate(validationSchemas.createSeed), sanitizeInput, async (req, res) => {
  const { name, variety, price_per_kg, stock_kg, description } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO seeds (name, variety, price_per_kg, stock_kg, description) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, variety, price_per_kg, stock_kg, description]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'seed', $3, $4, $5)`,
      [req.user.id, 'Add Seed', rows[0].id, `Added seed: ${name} (${variety}), ₹${price_per_kg}/kg, stock: ${stock_kg}kg`, req.ip || req.connection?.remoteAddress]
    );
    res.status(201).json({ id: rows[0].id, message: 'Seed added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/seed-purchases/:id
router.patch('/seed-purchases/:id', ...isAdmin, validate(validationSchemas.updateSeedPurchase), sanitizeInput, async (req, res) => {
  const { status } = req.body;
  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    const paymentStatus = status === 'approved' ? 'paid' : 'failed';
    const { rows } = await db.query(
      "UPDATE seed_purchases SET payment_status = $1 WHERE id = $2 RETURNING farmer_id, total_amount",
      [paymentStatus, req.params.id]
    );

    if (rows.length > 0) {
      const p = rows[0];
      if (status === 'approved') {
        // Add transaction ledger entry since it's now paid
        await db.query(
          `INSERT INTO transactions
             (reference_type, reference_id, farmer_id, amount, direction, status, description)
           VALUES ('seed_purchase', $1, $2, $3, 'debit', 'completed', 'Seed purchase payment received at warehouse')`,
          [req.params.id, p.farmer_id, p.total_amount]
        );
      }
      
      await db.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'seed_purchase', $3, $4, $5)`,
        [req.user.id, status === 'approved' ? 'Approve Seed Purchase' : 'Reject Seed Purchase', req.params.id, `Manager ${status} the warehouse payment of ₹${p.total_amount}`, req.ip || req.connection?.remoteAddress]
      );

      // Mark notification as read globally
      await db.query(
        "UPDATE notifications SET is_read = TRUE WHERE reference_type = 'seed_purchase' AND reference_id = $1",
        [req.params.id]
      );
    }
    res.json({ message: `Seed purchase ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/seeds/:id
router.patch('/seeds/:id', ...isAdmin, validate(validationSchemas.updateSeed), sanitizeInput, async (req, res) => {
  const { name, variety, price_per_kg, stock_kg, description, is_active } = req.body;
  const updatedPrice = req.user.role === 'super_admin' ? price_per_kg : null;
  try {
    await db.query(
      `UPDATE seeds
       SET name        = COALESCE($1, name),
           variety     = COALESCE($2, variety),
           price_per_kg= COALESCE($3, price_per_kg),
           stock_kg    = COALESCE($4, stock_kg),
           description = COALESCE($5, description),
           is_active   = COALESCE($6, is_active),
           updated_at  = now()
       WHERE id = $7`,
      [name, variety, updatedPrice, stock_kg, description, is_active, req.params.id]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'seed', $3, $4, $5)`,
      [req.user.id, 'Update Seed', req.params.id, `Updated seed fields: ${[name && 'name', variety && 'variety', price_per_kg && 'price', stock_kg && 'stock', description && 'description', is_active !== undefined && 'active status'].filter(Boolean).join(', ')}`, req.ip || req.connection?.remoteAddress]
    );
    res.json({ message: 'Seed updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/warehouses
router.get('/warehouses', ...isAdmin, async (req, res) => {
  try {
    const { rows: warehouses } = await db.query('SELECT * FROM warehouses ORDER BY name');
    const result = await Promise.all(warehouses.map(async (w) => {
      const { rows: inventory } = await db.query(
        'SELECT * FROM warehouse_inventory WHERE warehouse_id = $1', [w.id]
      );
      return { ...w, inventory };
    }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/warehouses
router.post('/warehouses', ...isAdmin, validate(validationSchemas.createWarehouse), sanitizeInput, async (req, res) => {
  const { name, address, total_capacity_kg } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO warehouses (name, address, total_capacity_kg) VALUES ($1, $2, $3) RETURNING id`,
      [name, address, total_capacity_kg]
    );
    res.status(201).json({ id: rows[0].id, message: 'Warehouse created' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/warehouses/:id/inventory
router.post('/warehouses/:id/inventory', ...isAdmin, validate(validationSchemas.addWarehouseInventory), sanitizeInput, async (req, res) => {
  const { grain_type, quantity_kg } = req.body;
  const warehouseId = req.params.id;
  const qty = parseFloat(quantity_kg);
  try {
    const { rows: whRows } = await db.query('SELECT * FROM warehouses WHERE id = $1', [warehouseId]);
    if (whRows.length === 0) return res.status(404).json({ error: 'Warehouse not found' });
    const wh = whRows[0];
    
    if (parseFloat(wh.current_load_kg) + qty > parseFloat(wh.total_capacity_kg)) {
      return res.status(400).json({ error: 'Exceeds total capacity' });
    }

    await db.query(
      `INSERT INTO warehouse_inventory (warehouse_id, grain_type, quantity_kg)
       VALUES ($1, $2, $3)
       ON CONFLICT (warehouse_id, grain_type)
       DO UPDATE SET quantity_kg = warehouse_inventory.quantity_kg + $3, last_updated = now()`,
      [warehouseId, grain_type, qty]
    );

    await db.query(
      'UPDATE warehouses SET current_load_kg = current_load_kg + $1 WHERE id = $2',
      [qty, warehouseId]
    );

    res.json({ message: 'Inventory added' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/warehouse-slots
router.get('/warehouse-slots', ...isAdmin, async (req, res) => {
  const { warehouse_id, date } = req.query;
  try {
    let sql = `
      SELECT ws.*, w.name as warehouse_name 
      FROM warehouse_slots ws
      JOIN warehouses w ON w.id = ws.warehouse_id
      WHERE 1=1
    `;
    const params = [];
    if (warehouse_id) { params.push(warehouse_id); sql += ` AND ws.warehouse_id = $${params.length}`; }
    if (date) { params.push(date); sql += ` AND ws.slot_date = $${params.length}`; }
    sql += ' ORDER BY ws.slot_date DESC, ws.start_time ASC';
    
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/warehouse-slots
router.post('/warehouse-slots', ...isAdmin, validate(validationSchemas.createWarehouseSlot), sanitizeInput, async (req, res) => {
  const { warehouse_id, slot_date, start_time, end_time, total_capacity_kg } = req.body;
  if (!warehouse_id || !slot_date || !start_time || !end_time || !total_capacity_kg) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const { rows } = await db.query(
      `INSERT INTO warehouse_slots (warehouse_id, slot_date, start_time, end_time, total_capacity_kg)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [warehouse_id, slot_date, start_time, end_time, total_capacity_kg]
    );
    res.status(201).json({ id: rows[0].id, message: 'Slot created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/warehouse-slots/:id
router.patch('/warehouse-slots/:id', ...isAdmin, validate(validationSchemas.updateWarehouseSlot), sanitizeInput, async (req, res) => {
  const { status, total_capacity_kg } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM warehouse_slots WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Slot not found' });
    
    await db.query(
      `UPDATE warehouse_slots
       SET status = COALESCE($1, status),
           total_capacity_kg = COALESCE($2, total_capacity_kg)
       WHERE id = $3`,
      [status, total_capacity_kg, req.params.id]
    );
    res.json({ message: 'Slot updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/managers
router.get('/managers', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT id, name, email, phone FROM users WHERE role = 'manager' AND status = 'active' ORDER BY name ASC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/visits
router.get('/visits', ...isAdmin, async (req, res) => {
  try {
    let query = `
      SELECT fv.*, 
             u.name as farmer_name, 
             u.phone as farmer_phone,
             m.name as manager_name,
             m.phone as manager_phone,
             c.crop_type, 
             c.sowing_date,
             c.notes as description,
             fp.crop_address
      FROM farm_visits fv
      JOIN users u ON u.id = fv.farmer_id
      LEFT JOIN users m ON m.id = fv.admin_id
      JOIN crops c ON c.id = fv.crop_id
      LEFT JOIN farmer_profiles fp ON fp.user_id = fv.farmer_id
    `;
    const params = [];
    if (req.user.role === 'manager') {
      query += ` WHERE fv.admin_id = $1`;
      params.push(req.user.id);
    }
    query += ` ORDER BY fv.scheduled_date ASC, fv.created_at DESC`;
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/active-crops
router.get('/active-crops', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT c.id as crop_id, c.crop_type, c.acres, c.sowing_date, u.name as farmer_name, u.phone as farmer_phone, u.id as farmer_id
      FROM crops c
      JOIN users u ON u.id = c.farmer_id
      WHERE c.status = 'growing'
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/visits
router.post('/visits', ...isAdmin, validate(validationSchemas.createFarmVisit), sanitizeInput, async (req, res) => {
  const { crop_id, farmer_id, visit_month, scheduled_date, admin_id } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO farm_visits (crop_id, farmer_id, admin_id, visit_month, scheduled_date)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [crop_id, farmer_id, admin_id || null, visit_month, scheduled_date]
    );
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
      [farmer_id, 'Farm Visit Scheduled', `A visit has been scheduled for ${scheduled_date} (Month ${visit_month}).`]
    );
    if (admin_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
        [admin_id, 'Farm Visit Assigned', `You have been assigned a farm visit for farmer #${farmer_id} on ${scheduled_date}.`]
      );
    }
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'farm_visit', $3, $4, $5)`,
      [req.user.id, 'Schedule Farm Visit', rows[0].id, `Scheduled visit for farmer ${farmer_id} on ${scheduled_date}`, req.ip || req.connection?.remoteAddress]
    );
    res.status(201).json({ id: rows[0].id, message: 'Visit scheduled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/visits/:id
router.patch('/visits/:id', ...isAdmin, validate(validationSchemas.updateFarmVisit), sanitizeInput, async (req, res) => {
  const { status, actual_date, verified_acres, report, scheduled_date, admin_id } = req.body;
  try {
    await db.query(
      `UPDATE farm_visits
       SET status         = COALESCE($1, status),
           actual_date    = COALESCE($2, actual_date),
           verified_acres = COALESCE($3, verified_acres),
           report         = COALESCE($4, report),
           scheduled_date = COALESCE($5, scheduled_date),
           admin_id       = COALESCE($6, admin_id)
       WHERE id = $7`,
      [status, actual_date, verified_acres, report, scheduled_date, admin_id, req.params.id]
    );
    if (admin_id) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
        [admin_id, 'Farm Visit Assigned', `You have been assigned to Farm Visit #${req.params.id}.`]
      );
    }
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'farm_visit', $3, $4, $5)`,
      [req.user.id, status ? `Update Farm Visit (${status})` : 'Update Farm Visit', req.params.id, `Updated visit: ${[status && `status=${status}`, actual_date && `actual_date=${actual_date}`, verified_acres && `acres=${verified_acres}`, report && 'report added'].filter(Boolean).join(', ')}`, req.ip || req.connection?.remoteAddress]
    );
    res.json({ message: 'Visit updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/visits/trigger-notifications
router.post('/visits/trigger-notifications', ...isAdmin, async (req, res) => {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const targetDateString = targetDate.toISOString().split('T')[0];

    const { rows } = await db.query(
      "SELECT id, farmer_id, scheduled_date FROM farm_visits WHERE status = 'scheduled' AND scheduled_date = $1",
      [targetDateString]
    );

    let count = 0;
    for (const visit of rows) {
      // Check if notification already sent to avoid duplicates
      const { rows: existing } = await db.query(
        "SELECT id FROM notifications WHERE reference_type = 'farm_visit' AND reference_id = $1",
        [visit.id]
      );
      if (existing.length === 0) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) 
           VALUES ($1, $2, $3, 'info', 'farm_visit', $4)`,
          [visit.farmer_id, 'Upcoming Farm Visit', `Reminder: Your farm visit is scheduled for ${visit.scheduled_date}. Please be available at the farm.`, visit.id]
        );
        count++;
      }
    }
    
    res.json({ message: `Triggered ${count} notifications for visits on ${targetDateString}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/market-rates
router.get('/market-rates', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM market_rates ORDER BY crop_type, grade');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/market-rates
router.post('/market-rates', ...isAdmin, validate(validationSchemas.setMarketRate), sanitizeInput, async (req, res) => {
  const { crop_type, grade, price_per_kg, effective_date } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO market_rates (crop_type, grade, price_per_kg, effective_date, set_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [crop_type, grade, price_per_kg, effective_date || new Date().toISOString().split('T')[0], req.user.id]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'market_rate', $3, $4, $5)`,
      [req.user.id, 'Set Market Rate', rows[0].id, `Set rate for ${crop_type} Grade ${grade}: ₹${price_per_kg}/kg`, req.ip || req.connection?.remoteAddress]
    );
    res.status(201).json({ id: rows[0].id, message: 'Rate set' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/transactions
router.get('/transactions', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT t.*, u.name as farmer_name, u.phone FROM transactions t
      LEFT JOIN users u ON u.id = t.farmer_id
      ORDER BY t.created_at DESC LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/transactions/:id/pay
router.patch('/transactions/:id/pay', ...isAdmin, validate(validationSchemas.processPayment), sanitizeInput, async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM transactions WHERE id = $1 AND status = 'pending' AND direction = 'credit'",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Pending credit transaction not found' });
    const tx = rows[0];

    await db.query("UPDATE transactions SET status = 'completed' WHERE id = $1", [tx.id]);
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'success')`,
      [tx.farmer_id, 'Payment Received',
       `A payment of ₹${parseFloat(tx.amount).toFixed(2)} for ${tx.description} has been processed.`]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'transaction', $3, $4, $5)`,
      [req.user.id, 'Process Payment', tx.id, `Paid ₹${parseFloat(tx.amount).toFixed(2)} for ${tx.description}`, req.ip || req.connection?.remoteAddress]
    );
    res.json({ message: 'Transaction paid successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT al.*, u.name, u.role FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ORDER BY al.created_at DESC LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/warehouse-slots
router.get('/warehouse-slots', ...isAdmin, async (req, res) => {
  const { warehouse_id, date } = req.query;
  try {
    let query = 'SELECT * FROM warehouse_slots WHERE status = \'active\'';
    const params = [];
    if (warehouse_id) { params.push(warehouse_id); query += ` AND warehouse_id = $${params.length}`; }
    if (date) { params.push(date); query += ` AND slot_date = $${params.length}`; }
    query += ' ORDER BY start_time ASC';

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/booking-slots
router.get('/booking-slots', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT bs.*,
             u.name as farmer_name, u.phone,
             w.name as warehouse_name,
             ci.id as inspection_id,
             COALESCE(gs.good_material_kg, ci.good_quantity_kg) as good_quantity_kg,
             COALESCE(gs.wastage_kg, ci.bad_quantity_kg) as bad_quantity_kg,
             ci.rejection_reason, ci.notes as inspection_notes,
             ci.created_at as inspection_date,
             insp.name as inspector_name
      FROM booking_slots bs
      JOIN users u ON u.id = bs.farmer_id
      JOIN warehouses w ON w.id = bs.warehouse_id
      LEFT JOIN crop_inspections ci ON ci.booking_slot_id = bs.id
      LEFT JOIN grain_sales gs ON gs.id = bs.grain_sale_id
      LEFT JOIN users insp ON insp.id = ci.inspector_id
      ORDER BY bs.booking_date DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.put('/booking-slots/:id/edit-yield', ...isAdmin, async (req, res) => {
  const { good_quantity_kg, bad_quantity_kg } = req.body;
  const slotId = req.params.id;

  const good = parseFloat(good_quantity_kg);
  const bad = parseFloat(bad_quantity_kg);
  if (isNaN(good) || isNaN(bad) || good < 0 || bad < 0) {
    return res.status(400).json({ error: 'Quantities must be non-negative numbers' });
  }

  try {
    const { rows: slotRows } = await db.query('SELECT * FROM booking_slots WHERE id = $1', [slotId]);
    if (slotRows.length === 0) return res.status(404).json({ error: 'Slot not found' });
    const slot = slotRows[0];

    if (!slot.grain_sale_id) {
      return res.status(400).json({ error: 'No grain sale linked to this booking slot' });
    }

    const { rows: rateRows } = await db.query(
      "SELECT price_per_kg FROM market_rates WHERE crop_type = $1 AND grade = 'A' ORDER BY effective_date DESC, created_at DESC LIMIT 1",
      [slot.grain_type]
    );
    const rate = rateRows.length > 0 ? parseFloat(rateRows[0].price_per_kg) : 0;
    const total_amount = good * rate;

    await db.query(
      `UPDATE grain_sales 
       SET wastage_kg = $1, good_material_kg = $2, price_per_kg = $3, total_amount = $4, status = 'received', updated_at = now() 
       WHERE id = $5`,
      [bad, good, rate, total_amount, slot.grain_sale_id]
    );

    // Notify admins
    const { rows: admins } = await db.query(
      "SELECT id FROM users WHERE role = 'super_admin' AND status = 'active'"
    );
    const notifMsg = `Yield updated for Booking #${slotId} (Sale #${slot.grain_sale_id}). Good: ${good}kg, Waste: ${bad}kg. Updated by ${req.user.name || 'Manager'}.`;
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         VALUES ($1, $2, $3, 'info', 'grain_sale', $4)`,
        [admin.id, 'Procurement Yield Updated', notifMsg, slot.grain_sale_id]
      );
    }

    res.json({ message: 'Yield updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/booking-slots/:id
router.patch('/booking-slots/:id', ...isAdmin, async (req, res) => {
  const { status } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM booking_slots WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Slot not found' });
    const slot = rows[0];

    if (status === 'confirmed') {
      const { warehouse_slot_id } = req.body;
      if (!warehouse_slot_id) return res.status(400).json({ error: 'Warehouse time slot is required to confirm booking.' });

      const { rows: slotRows } = await db.query(
        'SELECT * FROM warehouse_slots WHERE id = $1 AND status = \'active\' AND warehouse_id = $2', [warehouse_slot_id, slot.warehouse_id]
      );
      const wSlot = slotRows[0];
      if (!wSlot) return res.status(404).json({ error: 'Selected time slot not found, inactive, or invalid' });

      const available = parseFloat(wSlot.total_capacity_kg) - parseFloat(wSlot.booked_capacity_kg);
      if (slot.quantity_kg > available) {
        return res.status(400).json({ error: `Insufficient capacity in this time slot. Available: ${available.toFixed(0)} kg` });
      }

      // assign slot and increase booked capacity
      await db.query('UPDATE warehouse_slots SET booked_capacity_kg = booked_capacity_kg + $1 WHERE id = $2', [slot.quantity_kg, warehouse_slot_id]);
      await db.query('UPDATE booking_slots SET warehouse_slot_id = $1 WHERE id = $2', [warehouse_slot_id, req.params.id]);

      await db.query(
        `INSERT INTO warehouse_inventory (warehouse_id, grain_type, quantity_kg)
         VALUES ($1, $2, $3)
         ON CONFLICT (warehouse_id, grain_type)
         DO UPDATE SET quantity_kg = warehouse_inventory.quantity_kg + $3, last_updated = now()`,
        [slot.warehouse_id, slot.grain_type, slot.quantity_kg]
      );
      await db.query(
        'UPDATE warehouses SET current_load_kg = current_load_kg + $1 WHERE id = $2',
        [slot.quantity_kg, slot.warehouse_id]
      );
    }

    await db.query('UPDATE booking_slots SET status = $1 WHERE id = $2', [status, req.params.id]);

    if (status === 'completed' && slot.grain_sale_id) {
      // Find the latest market rate for this grain type (default to Grade A)
      const { rows: rateRows } = await db.query(
        "SELECT price_per_kg FROM market_rates WHERE crop_type = $1 AND grade = 'A' ORDER BY effective_date DESC, created_at DESC LIMIT 1",
        [slot.grain_type]
      );
      const rate = rateRows.length > 0 ? parseFloat(rateRows[0].price_per_kg) : 0;
      
      const raw_kg = parseFloat(slot.quantity_kg);
      const wastage_kg = raw_kg * 0.05; // 5% default wastage
      const good_kg = raw_kg - wastage_kg;
      const total = good_kg * rate;

      await db.query(
        `UPDATE grain_sales 
         SET wastage_kg = $1, good_material_kg = $2, price_per_kg = $3, total_amount = $4, status = 'received', updated_at = now() 
         WHERE id = $5`,
        [wastage_kg, good_kg, rate, total, slot.grain_sale_id]
      );

      const { rows: admins } = await db.query("SELECT id FROM users WHERE role = 'super_admin'");
      for (const admin of admins) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES ($1, $2, $3, 'info', 'grain_sale', $4)`,
          [admin.id, 'Crop Received', `Crop for Sale #${slot.grain_sale_id} has been received. Ready for payment.`, slot.grain_sale_id]
        );
      }
    }

    const statusLabel = status === 'delivered' ? 'Delivered to Warehouse' : status;
    const isSuccess = (status === 'confirmed' || status === 'completed' || status === 'delivered');
    const notifType = isSuccess ? 'success' : (status === 'cancelled' ? 'error' : 'warning');
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [slot.farmer_id, `Booking Slot ${statusLabel}`,
       `Your delivery slot on ${slot.booking_date} has been marked as ${statusLabel}.`,
       notifType]
    );

    const actionLabel = status === 'confirmed' ? 'Confirm Slot' : (status === 'completed' ? 'Complete Slot' : status === 'delivered' ? 'Mark Delivered' : 'Cancel/Reject Slot');
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'booking_slot', $3, $4, $5)`,
      [req.user.id, actionLabel, req.params.id, `Manager ${status} booking slot for ${slot.quantity_kg}kg of ${slot.grain_type}`, req.ip || req.connection?.remoteAddress]
    );

    // Mark notification as read globally
    await db.query(
      "UPDATE notifications SET is_read = TRUE WHERE reference_type = 'booking_slot' AND reference_id = $1",
      [req.params.id]
    );

    res.json({ message: `Slot ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/booking-slots/:id/inspect
router.post('/booking-slots/:id/inspect', ...isAdmin, async (req, res) => {
  const { good_quantity_kg, bad_quantity_kg, rejection_reason, notes } = req.body;
  const slotId = req.params.id;

  // Basic validation
  if (good_quantity_kg === undefined || bad_quantity_kg === undefined) {
    return res.status(400).json({ error: 'good_quantity_kg and bad_quantity_kg are required' });
  }
  const good = parseFloat(good_quantity_kg);
  const bad  = parseFloat(bad_quantity_kg);
  if (isNaN(good) || isNaN(bad) || good < 0 || bad < 0) {
    return res.status(400).json({ error: 'Quantities must be non-negative numbers' });
  }

  try {
    const { rows: slotRows } = await db.query('SELECT * FROM booking_slots WHERE id = $1', [slotId]);
    if (slotRows.length === 0) return res.status(404).json({ error: 'Slot not found' });
    const slot = slotRows[0];

    if (slot.status !== 'delivered') {
      return res.status(400).json({ error: 'Inspection is only allowed for slots with status \'delivered\'' });
    }

    const total_qty = parseFloat(slot.quantity_kg);
    const sum = parseFloat((good + bad).toFixed(4));
    if (Math.abs(sum - total_qty) > 0.01) {
      return res.status(400).json({
        error: `Good (${good} kg) + Bad (${bad} kg) = ${sum} kg does not match total quantity (${total_qty} kg)`,
      });
    }

    // Prevent duplicate inspection
    const { rows: existingInspection } = await db.query(
      'SELECT id FROM crop_inspections WHERE booking_slot_id = $1', [slotId]
    );
    if (existingInspection.length > 0) {
      return res.status(409).json({ error: 'This slot has already been inspected' });
    }

    // Save inspection record
    await db.query(
      `INSERT INTO crop_inspections (booking_slot_id, grain_sale_id, inspector_id, good_quantity_kg, bad_quantity_kg, rejection_reason, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [slotId, slot.grain_sale_id || null, req.user.id, good, bad, rejection_reason || null, notes || null]
    );

    // Update booking slot status
    await db.query("UPDATE booking_slots SET status = 'Inspection Completed' WHERE id = $1", [slotId]);

    // Update grain_sales with actual inspection quantities
    if (slot.grain_sale_id) {
      const { rows: rateRows } = await db.query(
        "SELECT price_per_kg FROM market_rates WHERE crop_type = $1 AND grade = 'A' ORDER BY effective_date DESC, created_at DESC LIMIT 1",
        [slot.grain_type]
      );
      const rate = rateRows.length > 0 ? parseFloat(rateRows[0].price_per_kg) : 0;
      const total_amount = good * rate;
      await db.query(
        `UPDATE grain_sales
         SET raw_material_kg = $1, wastage_kg = $2, good_material_kg = $3,
             price_per_kg = $4, total_amount = $5, updated_at = now()
         WHERE id = $6`,
        [total_qty, bad, good, rate, total_amount, slot.grain_sale_id]
      );
    }

    // Fetch farmer name for notification
    const { rows: farmerRows } = await db.query('SELECT name FROM users WHERE id = $1', [slot.farmer_id]);
    const farmerName = farmerRows[0]?.name || 'Farmer';
    const { rows: inspectorRows } = await db.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    const inspectorName = inspectorRows[0]?.name || 'Manager';
    const { rows: warehouseRows } = await db.query('SELECT name FROM warehouses WHERE id = $1', [slot.warehouse_id]);
    const warehouseName = warehouseRows[0]?.name || 'Warehouse';
    const inspectionDate = new Date().toLocaleDateString('en-IN');

    // Notify all super_admins
    const { rows: admins } = await db.query(
      "SELECT id FROM users WHERE role = 'super_admin' AND status = 'active'"
    );
    const notifTitle = 'Crop Inspection Completed';
    const notifMsg = `Inspection completed for ${farmerName}'s ${slot.grain_type} (${slot.quantity_kg} kg) at ${warehouseName}. ` +
      `Good: ${good} kg | Rejected: ${bad} kg${rejection_reason ? ` (${rejection_reason})` : ''}. ` +
      `Inspected by ${inspectorName} on ${inspectionDate}.`;
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         VALUES ($1, $2, $3, 'info', 'booking_slot', $4)`,
        [admin.id, notifTitle, notifMsg, slotId]
      );
    }

    // Audit log
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address)
       VALUES ($1, 'Crop Inspection', 'booking_slot', $2, $3, $4)`,
      [
        req.user.id, slotId,
        `Inspected ${slot.grain_type}: ${total_qty} kg total — Good: ${good} kg, Rejected: ${bad} kg${rejection_reason ? ` (${rejection_reason})` : ''}`,
        req.ip || req.connection?.remoteAddress,
      ]
    );

    res.status(201).json({
      message: 'Inspection saved successfully',
      good_quantity_kg: good,
      bad_quantity_kg: bad,
    });
  } catch (err) {
    console.error('Inspection error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/grain-sales
router.get('/grain-sales', ...isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT gs.*, u.name as farmer_name, u.phone as farmer_phone,
             fp.bank_name, fp.account_number, fp.ifsc_code, fp.upi_id
      FROM grain_sales gs
      JOIN users u ON u.id = gs.farmer_id
      LEFT JOIN farmer_profiles fp ON fp.user_id = gs.farmer_id
      ORDER BY gs.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/grain-sales/procure
router.post('/grain-sales/procure', ...isAdmin, async (req, res) => {
  const { farmer_id, grain_type, grade, raw_material_kg, good_material_kg, wastage_kg } = req.body;
  try {
    // 1. Calculate price from market rates
    const { rows: rateRows } = await db.query(
      "SELECT price_per_kg FROM market_rates WHERE crop_type = $1 AND grade = $2 ORDER BY effective_date DESC, created_at DESC LIMIT 1",
      [grain_type, grade]
    );
    const rate = rateRows.length > 0 ? parseFloat(rateRows[0].price_per_kg) : 0;
    const total_amount = good_material_kg * rate;

    // 2. Insert into grain_sales
    const { rows } = await db.query(
      `INSERT INTO grain_sales (farmer_id, grain_type, grade, raw_material_kg, good_material_kg, wastage_kg, price_per_kg, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'received') RETURNING id`,
      [farmer_id, grain_type, grade, raw_material_kg, good_material_kg, wastage_kg, rate, total_amount]
    );
    const saleId = rows[0].id;

    // 3. Notify Super Admin
    const { rows: admins } = await db.query("SELECT id FROM users WHERE role = 'super_admin'");
    for (const admin of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id) VALUES ($1, $2, $3, 'info', 'grain_sale', $4)`,
        [admin.id, 'Crop Procured', `New crop procured (${grain_type}, ${good_material_kg}kg). Ready for payment.`, saleId]
      );
    }

    res.status(201).json({ message: 'Crop procured successfully', id: saleId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/grain-sales/:id
router.patch('/grain-sales/:id', ...isAdmin, async (req, res) => {
  const { status, final_amount } = req.body;
  try {
    const { rows } = await db.query('SELECT * FROM grain_sales WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Sale not found' });
    const sale = rows[0];

    let total = parseFloat(sale.total_amount) || 0;
    if (status === 'approved') {
      if (final_amount !== undefined && final_amount !== null && parseFloat(final_amount) >= 0) {
        total = parseFloat(final_amount);
      }

      const good_material_kg = parseFloat(sale.good_material_kg) || 0;
      let price_per_kg = parseFloat(sale.price_per_kg) || 0;

      if (good_material_kg > 0) {
        price_per_kg = total / good_material_kg;
      } else {
        // Fallback: if good_material_kg was not initialized (is 0)
        const raw_kg = parseFloat(sale.raw_material_kg) || 0;
        const wastage = raw_kg * 0.05;
        const good_kg = raw_kg - wastage;

        if (!price_per_kg) {
          const { rows: rateRows } = await db.query(
            "SELECT price_per_kg FROM market_rates WHERE crop_type = $1 AND grade = 'A' ORDER BY effective_date DESC, created_at DESC LIMIT 1",
            [sale.grain_type]
          );
          price_per_kg = rateRows.length > 0 ? parseFloat(rateRows[0].price_per_kg) : 0;
        }

        await db.query(
          'UPDATE grain_sales SET wastage_kg = $1, good_material_kg = $2 WHERE id = $3',
          [wastage, good_kg, sale.id]
        );

        if (total === 0 || isNaN(total)) {
          total = good_kg * price_per_kg;
        }
        price_per_kg = good_kg > 0 ? (total / good_kg) : price_per_kg;
      }

      await db.query(
        'UPDATE grain_sales SET status = $1, price_per_kg = $2, total_amount = $3, updated_at = now() WHERE id = $4',
        [status, price_per_kg, total, req.params.id]
      );

      // Check if transaction already exists to avoid duplicate entries
      const { rows: existingTx } = await db.query(
        "SELECT id FROM transactions WHERE reference_type = 'grain_sale' AND reference_id = $1",
        [sale.id]
      );
      if (existingTx.length === 0) {
        await db.query(
          `INSERT INTO transactions (reference_type, reference_id, farmer_id, amount, direction, status, description)
           VALUES ('grain_sale', $1, $2, $3, 'credit', 'pending', $4)`,
          [sale.id, sale.farmer_id, total, `Grain sale - ${sale.grain_type} ${sale.grade} grade`]
        );
      }
    } else {
      await db.query(
        'UPDATE grain_sales SET status = $1, updated_at = now() WHERE id = $2',
        [status, req.params.id]
      );
    }

    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)`,
      [sale.farmer_id, `Grain Sale ${status}`,
       `Your grain sale request has been ${status}. Amount: ₹${total.toFixed(2)}`,
       status === 'approved' ? 'success' : 'error']
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'grain_sale', $3, $4, $5)`,
      [req.user.id, status === 'approved' ? 'Approve Grain Sale' : 'Reject Grain Sale', req.params.id, `Manager ${status} grain sale of ${sale.grain_type}. Amount: ₹${total.toFixed(2)}`, req.ip || req.connection?.remoteAddress]
    );
    res.json({ message: `Sale ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/grain-sales/:id/pay
router.patch('/grain-sales/:id/pay', ...isAdmin, async (req, res) => {
  try {
    const { rows: saleRows } = await db.query('SELECT * FROM grain_sales WHERE id = $1', [req.params.id]);
    if (saleRows.length === 0) return res.status(404).json({ error: 'Sale not found' });
    const sale = saleRows[0];

    const { rows: txRows } = await db.query(
      "SELECT * FROM transactions WHERE reference_type = 'grain_sale' AND reference_id = $1",
      [req.params.id]
    );
    
    let tx;
    if (txRows.length === 0) {
      // Create a new completed transaction
      const description = `Payment for ${sale.grain_type} procurement`;
      const { rows: newTxRows } = await db.query(
        `INSERT INTO transactions (reference_type, reference_id, farmer_id, amount, direction, status, description)
         VALUES ('grain_sale', $1, $2, $3, 'credit', 'completed', $4) RETURNING id`,
        [sale.id, sale.farmer_id, sale.total_amount, description]
      );
      tx = { 
        id: newTxRows[0].id, 
        amount: sale.total_amount, 
        farmer_id: sale.farmer_id, 
        description: description 
      };
    } else {
      tx = txRows[0];
      await db.query("UPDATE transactions SET status = 'completed' WHERE id = $1", [tx.id]);
    }

    await db.query("UPDATE grain_sales SET status = 'paid', updated_at = now() WHERE id = $1", [req.params.id]);
    
    await db.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'success')`,
      [tx.farmer_id, 'Payment Received', `A payment of ₹${parseFloat(tx.amount).toFixed(2)} for ${tx.description} has been processed.`]
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'transaction', $3, $4, $5)`,
      [req.user.id, 'Process Payment', tx.id, `Paid ₹${parseFloat(tx.amount).toFixed(2)} for grain sale ${req.params.id}`, req.ip || req.connection?.remoteAddress]
    );

    res.json({ message: 'Farmer paid successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports/monthly
router.get('/reports/monthly', ...isAdmin, async (req, res) => {
  const { month } = req.query;
  try {
    const { rows: farmers } = await db.query(`
      SELECT u.id, u.name, u.phone,
        (SELECT COUNT(*) FROM crops WHERE farmer_id = u.id) as total_crops,
        (SELECT COUNT(*) FROM seed_purchases WHERE farmer_id = u.id) as seed_purchases,
        (SELECT COALESCE(SUM(amount), 0) FROM transactions
          WHERE farmer_id = u.id AND direction = 'credit' AND status = 'completed') as total_earned
      FROM users u WHERE u.role = 'farmer' AND u.status = 'active'
    `);
    res.json({ month, farmers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/notifications
router.get('/notifications', ...isAdmin, async (req, res) => {
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

// PATCH /api/admin/notifications/read
router.patch('/notifications/read', ...isAdmin, async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/managers (super admin only)
router.get('/managers', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.status, u.created_at, ap.department
      FROM users u LEFT JOIN admin_profiles ap ON ap.user_id = u.id
      WHERE u.role = 'manager'
      ORDER BY u.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/managers (super admin only)
router.post('/managers', authMiddleware, requireRole('super_admin'), validate(validationSchemas.createManager), sanitizeInput, async (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name, email, phone, password, department } = req.body;
  if (!name || !phone || !password) return res.status(400).json({ error: 'Name, phone and password required' });
  const hash = bcrypt.hashSync(password, 10);
  try {
    const { rows } = await db.query(
      `INSERT INTO users (name, email, phone, password_hash, role, status, first_login)
       VALUES ($1, $2, $3, $4, 'manager', 'active', TRUE) RETURNING id`,
      [name, email || null, phone, hash]
    );
    const userId = rows[0].id;
    await db.query(
      `INSERT INTO admin_profiles (user_id, department) VALUES ($1, $2)`,
      [userId, department || 'Agriculture']
    );
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'manager', $3, $4, $5)`,
      [req.user.id, 'Create Manager', userId, `Created manager: ${name} (${phone}), dept: ${department || 'Agriculture'}`, req.ip || req.connection?.remoteAddress]
    );
    res.status(201).json({ id: userId, message: 'Manager created' });
  } catch (err) {
    res.status(400).json({ error: 'Phone/email already exists' });
  }
});

// PATCH /api/admin/managers/:id
router.patch('/managers/:id', authMiddleware, requireRole('super_admin'), validate(validationSchemas.updateManager), sanitizeInput, async (req, res) => {
  const { status } = req.body;
  try {
    await db.query("UPDATE users SET status = $1 WHERE id = $2 AND role = 'manager'", [status, req.params.id]);
    await db.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES ($1, $2, 'manager', $3, $4, $5)`,
      [req.user.id, status === 'active' ? 'Activate Manager' : 'Deactivate Manager', req.params.id, `Manager status changed to ${status}`, req.ip || req.connection?.remoteAddress]
    );
    res.json({ message: 'Manager updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
