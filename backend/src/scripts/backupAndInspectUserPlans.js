const db = require('../config/db');
const fs = require('fs');

(async () => {
  try {
    const res = await db.query(
      'SELECT * FROM business_plans WHERE user_id = $1 ORDER BY created_at ASC',
      ['904f290f-97f2-4ec9-8664-c706b21abfb6']
    );
    console.log('Total business_plans for user kisan@sih.gov.in (904f290f-97f2-4ec9-8664-c706b21abfb6):', res.rows.length);
    fs.writeFileSync('./src/scripts/backup_user_plans.json', JSON.stringify(res.rows, null, 2));
    console.log('Successfully backed up affected records to backend/src/scripts/backup_user_plans.json');
    
    res.rows.forEach((r, idx) => {
      console.log(`[${idx}] ID: ${r.id} | Type: ${r.business_type} | Title: ${r.plan_title} | Capital: ${r.capital} | Created: ${r.created_at.toISOString()}`);
    });

    if (db.getPool()) await db.getPool().end();
  } catch (err) {
    console.error('Error backing up:', err);
    process.exit(1);
  }
})();
