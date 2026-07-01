const express = require('express');
const router = express.Router();
const db = require('../database/db');

// GET /api/public/market-rates — no auth needed
router.get('/market-rates', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT crop_type, grade, price_per_kg, effective_date FROM market_rates ORDER BY crop_type, grade'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/seeds — no auth needed
router.get('/seeds', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT id, name, variety, price_per_kg, stock_kg, description FROM seeds WHERE is_active = TRUE ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/stats — platform statistics for landing page
router.get('/stats', async (req, res) => {
  try {
    const { rows: r1 } = await db.query("SELECT COUNT(*) as c FROM users WHERE role = 'farmer' AND status = 'active'");
    const { rows: r2 } = await db.query('SELECT COUNT(*) as c FROM crops');
    const { rows: r3 } = await db.query('SELECT COUNT(*) as c FROM seeds WHERE is_active = TRUE');
    const { rows: r4 } = await db.query('SELECT COUNT(*) as c FROM warehouses WHERE is_active = TRUE');
    res.json({
      farmers:    parseInt(r1[0].c),
      crops:      parseInt(r2[0].c),
      seeds:      parseInt(r3[0].c),
      warehouses: parseInt(r4[0].c),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
