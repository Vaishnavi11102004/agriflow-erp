require('dotenv').config({ path: 'server/.env' });
const db = require('./server/database/db.js');

async function run() {
  try {
    console.log('Running delete queries...');
    
    // 1. Delete seed purchases for these seeds
    await db.query("DELETE FROM seed_purchases WHERE seed_id IN (SELECT id FROM seeds WHERE name ILIKE '%soybean%' OR name ILIKE '%jowar%' OR name ILIKE '%abcd%')");
    
    // 2. Delete the seeds
    await db.query("DELETE FROM seeds WHERE name ILIKE '%soybean%' OR name ILIKE '%jowar%' OR name ILIKE '%abcd%'");
    
    // 3. Delete grain sales and booking slots for these crops
    await db.query("DELETE FROM booking_slots WHERE grain_type ILIKE '%soybean%' OR grain_type ILIKE '%jowar%' OR grain_type ILIKE '%abcd%'");
    await db.query("DELETE FROM grain_sales WHERE grain_type ILIKE '%soybean%' OR grain_type ILIKE '%jowar%' OR grain_type ILIKE '%abcd%'");
    
    // 4. Delete from warehouse inventory
    await db.query("DELETE FROM warehouse_inventory WHERE grain_type ILIKE '%soybean%' OR grain_type ILIKE '%jowar%' OR grain_type ILIKE '%abcd%'");
    
    // 5. Delete market rates
    await db.query("DELETE FROM market_rates WHERE crop_type ILIKE '%soybean%' OR crop_type ILIKE '%jowar%' OR crop_type ILIKE '%abcd%'");
    
    // 6. Delete farm visits and crops
    await db.query("DELETE FROM farm_visits WHERE crop_id IN (SELECT id FROM crops WHERE crop_type ILIKE '%soybean%' OR crop_type ILIKE '%jowar%' OR crop_type ILIKE '%abcd%')");
    await db.query("DELETE FROM crops WHERE crop_type ILIKE '%soybean%' OR crop_type ILIKE '%jowar%' OR crop_type ILIKE '%abcd%'");
    
    console.log('Deleted all references successfully.');
  } catch (e) {
    console.error(e);
  } finally {
    process.exit(0); 
  }
}

run();
