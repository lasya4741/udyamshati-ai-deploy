const db = require('../config/db');

async function testRestartPersistence() {
  console.log('====================================================================');
  console.log('🔄 Verifying Authentication Persistence Across Backend Server Restart');
  console.log('====================================================================');

  // Query the most recently registered user from Supabase PostgreSQL
  const dbUserRes = await db.query(
    `SELECT id, email, password_hash, full_name, role, preferred_language, created_at 
     FROM users 
     WHERE email LIKE 'suresh.patel.%@sih.gov.in' 
     ORDER BY created_at DESC 
     LIMIT 1`
  );

  if (dbUserRes.rows.length === 0) {
    console.error('❌ No registered user found in PostgreSQL!');
    process.exit(1);
  }

  const user = dbUserRes.rows[0];
  console.log(`Found persisted user in Supabase:`);
  console.log(`- ID: ${user.id}`);
  console.log(`- Email: ${user.email}`);
  console.log(`- Full Name: ${user.full_name}`);
  console.log(`- Created At: ${user.created_at}`);
  console.log(`- Hash prefix: ${user.password_hash.substring(0, 10)}...`);

  // Attempt login with the updated password against the restarted backend server
  const loginPayload = {
    email: user.email,
    password: 'NewlyUpdatedPassword2026!'
  };

  console.log('\nSending POST /api/auth/login to restarted server...');
  const res = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginPayload)
  });

  const status = res.status;
  const data = await res.json();

  console.log(`HTTP Status: ${status}`);
  console.log(`Returned email: ${data.user?.email}`);
  console.log(`Returned full name: ${data.user?.name}`);
  console.log(`JWT Token Present: ${Boolean(data.token)}`);
  console.log(`Password Hash Exposed: ${'password_hash' in (data.user || {}) || 'password' in (data.user || {})}`);

  if (status !== 200 || !data.token || data.user?.email !== user.email) {
    console.error('❌ Restart persistence test failed: unable to login after backend restart!');
    process.exit(1);
  }

  if ('password_hash' in (data.user || {}) || 'password' in (data.user || {})) {
    console.error('❌ Security check failed: password hash exposed in response!');
    process.exit(1);
  }

  console.log('\n✅ RESTART PERSISTENCE TEST PASSED: User authenticated successfully after server restart!');
  console.log('====================================================================');
  process.exit(0);
}

testRestartPersistence().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
