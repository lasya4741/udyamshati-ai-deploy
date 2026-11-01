const fs = require('fs');
const path = require('path');
const db = require('../config/db');

async function runMigration() {
  console.log('=======================================================');
  console.log('🚀 Starting UdyamSaarthi AI Database Migrations');
  console.log('=======================================================');

  if (!db.isConfigured()) {
    console.error('❌ Error: DATABASE_URL is not configured in backend/.env');
    process.exit(1);
  }

  const pool = db.getPool();
  if (!pool) {
    console.error('❌ Error: Could not initialize database connection pool.');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // 1. Create migration history tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Extensions enabling
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "postgis";');
    await client.query('CREATE EXTENSION IF NOT EXISTS "vector";');

    // 3. Find all migration files
    const migrationsDir = path.resolve(__dirname, '../../../database/migrations');
    if (!fs.existsSync(migrationsDir)) {
      throw new Error(`Migrations directory not found at: ${migrationsDir}`);
    }

    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${migrationFiles.length} migration file(s).`);

    for (const file of migrationFiles) {
      const migrationName = path.parse(file).name;
      const checkRes = await client.query(
        'SELECT id, name, applied_at FROM schema_migrations WHERE name = $1',
        [migrationName]
      );

      if (checkRes.rows.length > 0) {
        console.log(`ℹ️  Migration "${migrationName}" already applied at ${checkRes.rows[0].applied_at.toISOString()}. Skipping.`);
        continue;
      }

      console.log(`📝 Applying migration "${migrationName}"...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (name) VALUES ($1)',
        [migrationName]
      );
      await client.query('COMMIT');
      console.log(`  ✓ Successfully applied and recorded: ${migrationName}`);
    }

    console.log('=======================================================');
    console.log('✅ All migrations up to date!');
    console.log('=======================================================');

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Migration Failed!');
    console.error('Error details:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    if (require.main === module) {
      setTimeout(() => process.exit(process.exitCode || 0), 500);
    }
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };
