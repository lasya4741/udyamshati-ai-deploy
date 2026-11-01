const db = require('../config/db');

(async () => {
  try {
    const userRes = await db.query('SELECT * FROM users WHERE id = $1', ['904f290f-97f2-4ec9-8664-c706b21abfb6']);
    console.log('User 904f290f-97f2-4ec9-8664-c706b21abfb6:', userRes.rows[0]);

    const allUsers = await db.query('SELECT id, email, role, full_name, created_at FROM users ORDER BY created_at DESC LIMIT 15');
    console.log('\n--- ALL RECENT USERS ---');
    console.table(allUsers.rows);

    const plans = await db.query('SELECT * FROM business_plans ORDER BY created_at DESC LIMIT 20');
    console.log('\n--- RECENT BUSINESS PLANS (TOTAL:', plans.rows.length, ') ---');
    for (const p of plans.rows) {
      console.log('ID:', p.id, '| User:', p.user_id, '| Type:', p.business_type);
      console.log('  Title:', p.plan_title);
      console.log('  Capital:', p.capital);
      console.log('  Created:', p.created_at);
      console.log('  Location:', JSON.stringify(p.location));
      console.log('--------------------------------------------------');
    }

    if (db.getPool()) await db.getPool().end();
  } catch (err) {
    console.error('Error inspecting DB:', err);
    process.exit(1);
  }
})();
