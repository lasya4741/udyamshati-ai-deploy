const db = require('../config/db');

async function cleanDuplicates() {
  try {
    console.log('--- Cleaning duplicate business_plans for affected user ---');

    // Keep the latest record for each (user_id, business_type) and remove duplicates
    const deleteQuery = `
      DELETE FROM business_plans
      WHERE id NOT IN (
        SELECT DISTINCT ON (user_id, business_type) id
        FROM business_plans
        ORDER BY user_id, business_type, created_at DESC
      )
      AND user_id = '904f290f-97f2-4ec9-8664-c706b21abfb6'
      RETURNING id, business_type, plan_title, created_at;
    `;

    const res = await db.query(deleteQuery);
    console.log(`Deleted ${res.rows.length} duplicate rows:`);
    res.rows.forEach(r => console.log('  Removed duplicate ID:', r.id, '| Type:', r.business_type, '| Created:', r.created_at));

    const remaining = await db.query(
      'SELECT id, business_type, plan_title, capital, created_at FROM business_plans WHERE user_id = $1 ORDER BY created_at ASC',
      ['904f290f-97f2-4ec9-8664-c706b21abfb6']
    );

    console.log('\n--- Remaining distinct plans for user kisan@sih.gov.in: ---');
    console.table(remaining.rows);

    if (db.getPool()) await db.getPool().end();
  } catch (err) {
    console.error('Error cleaning duplicates:', err);
    process.exit(1);
  }
}

cleanDuplicates();
