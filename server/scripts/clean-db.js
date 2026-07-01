/**
 * Clean DB Script
 * Removes stale manager notifications for bank_request reference type.
 * Run: node server/scripts/clean-db.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../database/db');

async function run() {
  await db.query(
    `DELETE FROM notifications
     WHERE reference_type = 'bank_request'
       AND user_id IN (SELECT id FROM users WHERE role = 'manager')`
  );
  console.log('Cleaned up manager notifications');
  await db.pool.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
