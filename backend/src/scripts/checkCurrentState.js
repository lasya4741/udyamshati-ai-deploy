const db = require('../config/db');

async function main() {
  try {
    const u = await db.query('SELECT * FROM users WHERE email = $1', ['kisan@sih.gov.in']);
    console.log('USER:', u.rows[0]);
    if (u.rows.length > 0) {
      const uid = u.rows[0].id;
      const e = await db.query('SELECT * FROM entrepreneurs WHERE user_id = $1', [uid]);
      console.log('ENTREPRENEUR PROFILE:', e.rows[0]);
      const plans = await db.query('SELECT id, business_type, plan_title, capital, created_at, location FROM business_plans WHERE user_id = $1 ORDER BY created_at DESC', [uid]);
      console.log('BUSINESS PLANS COUNT:', plans.rows.length);
      plans.rows.forEach(p => console.log(`- [${p.id}] ${p.plan_title} (${p.business_type}) - Capital: ${p.capital} - Loc:`, p.location));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

main();
