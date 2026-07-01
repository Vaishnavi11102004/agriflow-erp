const db = require('./server/database/db.js');
async function fix() {
  const { rows } = await db.query("SELECT * FROM grain_sales WHERE status = 'approved' AND id NOT IN (SELECT reference_id::int FROM transactions WHERE reference_type = 'grain_sale')");
  for (let sale of rows) {
    let total = parseFloat(sale.total_amount) || (parseFloat(sale.price_per_kg || 0) * parseFloat(sale.good_material_kg));
    await db.query(
      "INSERT INTO transactions (reference_type, reference_id, farmer_id, amount, direction, status, description) VALUES ('grain_sale', $1, $2, $3, 'credit', 'pending', $4)",
      [sale.id, sale.farmer_id, total, `Grain sale - ${sale.grain_type} ${sale.grade} grade`]
    );
  }
  console.log('Fixed', rows.length, 'sales');
}
fix().catch(console.error).finally(() => process.exit(0));
