const db = require('../config/db');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('===============================================================');
  console.log('🧪 Running Live Supabase PostgreSQL Authentication Test Suite');
  console.log('===============================================================');

  const testUser = {
    fullName: 'Suresh Patel',
    email: `suresh.patel.${Date.now()}@sih.gov.in`,
    password: 'SecurePassword123!',
    preferredLanguage: 'hi',
    role: 'ENTREPRENEUR'
  };

  let registeredUserId = null;
  let authToken = null;

  // TEST 1: Register New User
  console.log('\n--- Test 1: Successful Registration ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const status = res.status;
    const body = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Response message: "${body.message}"`);
    console.log(`Has token: ${Boolean(body.token)}`);
    console.log(`Returned user email: ${body.user?.email}`);
    console.log(`Returned user ID: ${body.user?.id}`);
    console.log(`Password hash exposed in response: ${'password_hash' in (body.user || {}) || 'passwordHash' in (body.user || {}) || 'password' in (body.user || {})}`);

    if (status !== 201 || !body.token || !body.user?.id) {
      throw new Error(`Test 1 Failed: Expected status 201 with token, got ${status}`);
    }

    if ('password_hash' in body.user || 'password' in body.user) {
      throw new Error('Test 1 Failed: Password hash was exposed in API response!');
    }

    registeredUserId = body.user.id;
    authToken = body.token;
    console.log('✅ Test 1 PASSED: User registered successfully, JWT returned, password concealed.');
  } catch (err) {
    console.error('❌ Test 1 FAILED:', err.message);
    process.exit(1);
  }

  // TEST 2: Verify in Supabase PostgreSQL
  console.log('\n--- Test 2: Verify User Record in PostgreSQL ---');
  try {
    const dbRes = await db.query(
      'SELECT id, email, password_hash, role, full_name, preferred_language, created_at FROM users WHERE id = $1',
      [registeredUserId]
    );

    if (dbRes.rows.length === 0) {
      throw new Error('Test 2 Failed: User row not found in PostgreSQL table "users"');
    }

    const row = dbRes.rows[0];
    console.log(`Found row for ID: ${row.id}`);
    console.log(`DB email: ${row.email}`);
    console.log(`DB full_name: ${row.full_name}`);
    console.log(`DB role: ${row.role}`);
    console.log(`DB preferred_language: ${row.preferred_language}`);
    console.log(`Is password stored as bcrypt hash? ${row.password_hash.startsWith('$2a$') || row.password_hash.startsWith('$2b$')}`);
    console.log(`Is plaintext password stored? ${row.password_hash === testUser.password}`);

    if (row.password_hash === testUser.password) {
      throw new Error('Test 2 Failed: Plaintext password was found in database!');
    }

    if (!row.password_hash.startsWith('$2a$') && !row.password_hash.startsWith('$2b$')) {
      throw new Error('Test 2 Failed: Password hash does not match standard bcrypt format!');
    }

    console.log('✅ Test 2 PASSED: User record exists in Supabase with genuine bcrypt hash.');
  } catch (err) {
    console.error('❌ Test 2 FAILED:', err.message);
    process.exit(1);
  }

  // TEST 3: Login with Valid Credentials
  console.log('\n--- Test 3: Login with Valid Credentials ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password
      })
    });
    const status = res.status;
    const body = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Has token: ${Boolean(body.token)}`);
    console.log(`Returned user email: ${body.user?.email}`);
    console.log(`Password hash exposed in login response: ${'password_hash' in (body.user || {}) || 'password' in (body.user || {})}`);

    if (status !== 200 || !body.token || body.user?.email !== testUser.email) {
      throw new Error(`Test 3 Failed: Expected status 200 with matching email, got ${status}`);
    }

    if ('password_hash' in body.user || 'password' in body.user) {
      throw new Error('Test 3 Failed: Password hash was exposed in login response!');
    }

    console.log('✅ Test 3 PASSED: Valid credentials authenticated successfully against PostgreSQL.');
  } catch (err) {
    console.error('❌ Test 3 FAILED:', err.message);
    process.exit(1);
  }

  // TEST 4: Login with Incorrect Credentials
  console.log('\n--- Test 4: Login with Incorrect Password ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: 'WrongPassword999!'
      })
    });
    const status = res.status;
    const body = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Error message: "${body.error}"`);

    if (status !== 401 || !body.error) {
      throw new Error(`Test 4 Failed: Expected 401 Unauthorized, got ${status}`);
    }

    console.log('✅ Test 4 PASSED: Invalid password rejected with HTTP 401.');
  } catch (err) {
    console.error('❌ Test 4 FAILED:', err.message);
    process.exit(1);
  }

  // TEST 5: Duplicate Registration Check
  console.log('\n--- Test 5: Prevent Duplicate Email Registration ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });
    const status = res.status;
    const body = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Error message: "${body.error}"`);

    if (status !== 409 || !body.error.toLowerCase().includes('already exists')) {
      throw new Error(`Test 5 Failed: Expected 409 Conflict with 'already exists', got ${status}`);
    }

    console.log('✅ Test 5 PASSED: Duplicate registration prevented by database check and constraints.');
  } catch (err) {
    console.error('❌ Test 5 FAILED:', err.message);
    process.exit(1);
  }

  // TEST 6: Demo Login Flow
  console.log('\n--- Test 6: Demo Login Backed by PostgreSQL ---');
  try {
    const res = await fetch(`${BASE_URL}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const status = res.status;
    const body = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Demo user email: ${body.user?.email}`);
    console.log(`Demo user name: ${body.user?.name}`);
    console.log(`Has demo token: ${Boolean(body.token)}`);
    console.log(`Password hash exposed: ${'password_hash' in (body.user || {}) || 'password' in (body.user || {})}`);

    if (status !== 200 || !body.token || body.user?.email !== 'kisan@sih.gov.in') {
      throw new Error(`Test 6 Failed: Expected demo user kisan@sih.gov.in, got ${status}`);
    }

    console.log('✅ Test 6 PASSED: Demo login succeeded with PostgreSQL-backed user and valid JWT.');
  } catch (err) {
    console.error('❌ Test 6 FAILED:', err.message);
    process.exit(1);
  }

  // TEST 7: Change Password Flow
  console.log('\n--- Test 7: Authenticated Change Password Flow ---');
  const newPassword = 'NewlyUpdatedPassword2026!';
  try {
    const res = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        oldPassword: testUser.password,
        newPassword
      })
    });
    const status = res.status;
    const body = await res.json();

    console.log(`HTTP Status: ${status}`);
    console.log(`Response message: "${body.message}"`);

    if (status !== 200 || !body.message) {
      throw new Error(`Test 7 Failed: Expected 200 OK, got ${status}`);
    }

    // Now verify login with the new password
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUser.email,
        password: newPassword
      })
    });

    if (loginRes.status !== 200) {
      throw new Error(`Test 7 Failed: Login with new password failed with status ${loginRes.status}`);
    }

    console.log('✅ Test 7 PASSED: Password updated in PostgreSQL and verified by login.');
  } catch (err) {
    console.error('❌ Test 7 FAILED:', err.message);
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log('🎉 ALL AUTHENTICATION TESTS PASSED AGAINST LIVE SUPABASE POSTGRESQL');
  console.log('===============================================================');
  process.exit(0);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
