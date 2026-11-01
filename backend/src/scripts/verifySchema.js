const db = require('../config/db');

async function verify() {
  console.log('=======================================================');
  console.log('🔍 Verifying Supabase PostgreSQL Schema Integration');
  console.log('=======================================================');

  const pool = db.getPool();
  if (!pool) {
    console.error('Database connection pool not configured');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    // 1. Check Tables
    const expectedTables = [
      'users',
      'locations',
      'entrepreneurs',
      'business_categories',
      'businesses',
      'market_data',
      'schemes',
      'scheme_rules',
      'recommendations',
      'scheme_documents'
    ];

    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    const existingTables = tablesRes.rows.map(r => r.table_name);
    console.log('\n📋 Public Schema Tables in Supabase:');
    let allTablesFound = true;
    for (const table of expectedTables) {
      const found = existingTables.includes(table);
      if (!found) allTablesFound = false;
      console.log(`  ${found ? '✓' : '✗'} ${table}`);
    }

    // 2. Check Spatial & Vector Columns
    console.log('\n🌐 Checking Geometry (PostGIS) & Vector (pgvector) Columns:');
    
    // Check PostGIS geom on locations and businesses
    const geomRes = await client.query(`
      SELECT table_name, column_name, udt_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name = 'geom' 
        AND table_name IN ('locations', 'businesses');
    `);
    for (const row of geomRes.rows) {
      console.log(`  ✓ Table "${row.table_name}" has PostGIS spatial column: "${row.column_name}" (${row.udt_name})`);
    }

    // Check vector column on scheme_documents
    const vectorRes = await client.query(`
      SELECT table_name, column_name, udt_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name = 'embedding' 
        AND table_name = 'scheme_documents';
    `);
    for (const row of vectorRes.rows) {
      console.log(`  ✓ Table "${row.table_name}" has pgvector column: "${row.column_name}" (${row.udt_name})`);
    }

    // 3. Check Foreign Keys
    console.log('\n🔗 Checking Foreign Key Constraints:');
    const fkRes = await client.query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name;
    `);

    for (const fk of fkRes.rows) {
      console.log(`  ✓ ${fk.table_name}.${fk.column_name} ➔ ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    }

    // 4. Check GIST and B-Tree Indexes
    console.log('\n⚡ Checking Key Indexes:');
    const idxRes = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND (indexname LIKE 'idx_%' OR indexname LIKE '%_pkey')
      ORDER BY tablename, indexname;
    `);

    for (const idx of idxRes.rows) {
      console.log(`  ✓ [${idx.tablename}] Index: ${idx.indexname}`);
    }

    // 5. Check Migration History
    console.log('\n📜 Migration History:');
    const migRes = await client.query('SELECT id, name, applied_at FROM schema_migrations ORDER BY id;');
    for (const m of migRes.rows) {
      console.log(`  ✓ Migration #${m.id}: "${m.name}" applied at ${m.applied_at.toISOString()}`);
    }

    console.log('\n=======================================================');
    if (allTablesFound && geomRes.rows.length === 2 && vectorRes.rows.length === 1) {
      console.log('🎉 SCHEMA VERIFICATION PASSED: All 10 tables, PostGIS, pgvector, and foreign keys are verified!');
    } else {
      console.error('⚠️ Verification finished with missing items.');
      process.exitCode = 1;
    }
    console.log('=======================================================');

  } catch (err) {
    console.error('Verification error:', err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    setTimeout(() => process.exit(process.exitCode || 0), 500);
  }
}

verify();
