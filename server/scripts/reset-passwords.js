/**
 * Reset Passwords Script
 * Run from project root: npm run reset-passwords
 *
 * Resets all default credentials back to their original values.
 * Use this whenever login stops working due to forgotten passwords.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../database/db');
const bcrypt = require('bcryptjs');

const defaults = [
  { phone: '9999999999', password: 'Admin@123',   role: 'super_admin', first_login: true },
  { phone: '8888888888', password: 'Manager@123', role: 'manager',     first_login: false },
];

async function run() {
  console.log('\n🔑 Resetting default passwords...\n');

  for (const u of defaults) {
    const { rows } = await db.query('SELECT id, name FROM users WHERE phone = $1', [u.phone]);
    if (rows.length === 0) {
      console.log(`⚠️  No user found with phone ${u.phone} (${u.role}) — skipped`);
      continue;
    }
    const user = rows[0];
    const hash = bcrypt.hashSync(u.password, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, first_login = $2 WHERE phone = $3',
      [hash, u.first_login, u.phone]
    );
    console.log(`✅  ${user.name} (${u.phone}) → password reset to "${u.password}"`);
  }

  console.log('\n📋 Default Credentials:');
  console.log('   Super Admin : phone=9999999999  password=Admin@123');
  console.log('   Manager     : phone=8888888888  password=Manager@123');
  console.log('\nDone! Restart the server and try logging in.\n');

  await db.pool.end();
  process.exit(0);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
