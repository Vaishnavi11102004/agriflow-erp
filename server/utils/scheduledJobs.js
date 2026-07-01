/**
 * scheduledJobs.js
 * Runs background periodic jobs without external dependencies.
 * Uses setInterval to run a daily check for farm visits scheduled 2 days ahead
 * and sends reminder notifications to the respective farmers.
 */

const db = require('../database/db');

/**
 * Sends 2-day-prior reminder notifications for upcoming farm visits.
 * Skips visits that already have a reminder notification sent.
 */
async function sendFarmVisitReminders() {
  try {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 2);
    const targetDateString = targetDate.toISOString().split('T')[0];

    const { rows } = await db.query(
      `SELECT id, farmer_id, scheduled_date 
       FROM farm_visits 
       WHERE status = 'scheduled' AND scheduled_date = $1`,
      [targetDateString]
    );

    let count = 0;
    for (const visit of rows) {
      // Avoid duplicate reminders using reference_type + reference_id
      const { rows: existing } = await db.query(
        `SELECT id FROM notifications 
         WHERE reference_type = 'farm_visit' 
           AND reference_id = $1 
           AND title = 'Upcoming Farm Visit Reminder'`,
        [visit.id]
      );

      if (existing.length === 0) {
        await db.query(
          `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
           VALUES ($1, $2, $3, 'info', 'farm_visit', $4)`,
          [
            visit.farmer_id,
            'Upcoming Farm Visit Reminder',
            `Reminder: A field officer will visit your farm on ${visit.scheduled_date}. Please ensure you are available at the farm.`,
            visit.id,
          ]
        );
        count++;
      }
    }

    if (count > 0) {
      console.log(`[ScheduledJobs] ✅ Sent ${count} farm visit reminder(s) for ${targetDateString}`);
    } else {
      console.log(`[ScheduledJobs] ℹ️  No new farm visit reminders needed for ${targetDateString}`);
    }
  } catch (err) {
    console.error('[ScheduledJobs] ❌ Error sending farm visit reminders:', err.message);
  }
}

/**
 * Checks for "Pay at Warehouse" orders that are older than 24 hours.
 * Cancels them, restores stock, and notifies the farmer.
 */
async function cancelExpiredWarehouseOrders() {
  try {
    const { rows } = await db.query(
      `SELECT id, seed_id, quantity_kg, farmer_id, invoice_number 
       FROM seed_purchases 
       WHERE payment_status = 'pending' 
         AND created_at < NOW() - INTERVAL '24 hours'`
    );

    let count = 0;
    for (const order of rows) {
      await db.query(`UPDATE seed_purchases SET payment_status = 'failed' WHERE id = $1`, [order.id]);
      await db.query(`UPDATE seeds SET stock_kg = stock_kg + $1, updated_at = NOW() WHERE id = $2`, [order.quantity_kg, order.seed_id]);
      
      await db.query(
        `INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id)
         VALUES ($1, $2, $3, 'error', 'seed_purchase', $4)`,
        [
          order.farmer_id,
          'Warehouse Order Cancelled',
          `Your order (${order.invoice_number}) was cancelled because payment was not completed at the warehouse within 24 hours.`,
          order.id,
        ]
      );
      count++;
    }

    if (count > 0) {
      console.log(`[ScheduledJobs] ✅ Cancelled ${count} expired warehouse order(s) and restored stock`);
    }
  } catch (err) {
    console.error('[ScheduledJobs] ❌ Error cancelling expired warehouse orders:', err.message);
  }
}

/**
 * Starts all scheduled background jobs.
 * - Farm visit reminders: runs immediately on startup, then every 24 hours.
 */
function startScheduledJobs() {
  console.log('[ScheduledJobs] 🕐 Starting scheduled background jobs...');

  // Run immediately on server start
  sendFarmVisitReminders();
  cancelExpiredWarehouseOrders();

  // Farm visit reminders repeat every 24 hours (86400000 ms)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(sendFarmVisitReminders, TWENTY_FOUR_HOURS);

  // Expired warehouse orders check repeats every 1 hour (3600000 ms)
  const ONE_HOUR = 60 * 60 * 1000;
  setInterval(cancelExpiredWarehouseOrders, ONE_HOUR);

  console.log('[ScheduledJobs] ✅ Farm visit reminder job scheduled (runs every 24h)');
  console.log('[ScheduledJobs] ✅ Expired warehouse orders check scheduled (runs every 1h)');
}

module.exports = { startScheduledJobs, sendFarmVisitReminders, cancelExpiredWarehouseOrders };
