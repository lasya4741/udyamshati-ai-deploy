const axios = require('axios');
const db = require('../config/db');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function runTestSuite() {
  console.log('========================================================');
  console.log('🧪 RUNNING ENTREPRENEUR PROFILE MANAGEMENT TEST SUITE');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const timestamp = Date.now();
  const userAEmail = `entrepreneur.a.${timestamp}@sih.gov.in`;
  const userBEmail = `entrepreneur.b.${timestamp}@sih.gov.in`;
  const password = `SecureP@ss${timestamp}!`;

  let tokenA = null;
  let userAId = null;
  let tokenB = null;
  let userBId = null;

  try {
    // -----------------------------------------------------------------
    // TEST 1: User A Registration & Authentication
    // -----------------------------------------------------------------
    console.log('[Test 1] Registering User A...');
    const regARes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Sunita Devi',
      email: userAEmail,
      phone: '9876543210',
      password: password,
      preferredLanguage: 'hi'
    });

    assert(regARes.status === 201 && regARes.data.token, 'User A registered with JWT token');
    tokenA = regARes.data.token;
    userAId = regARes.data.user.id;
    console.log(`       User A ID: ${userAId}`);

    // Verify initial profile retrieval for User A before profile creation
    const initGetA = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert(initGetA.status === 200 && initGetA.data.hasProfile === false, 'User A initial profile has hasProfile: false');

    // -----------------------------------------------------------------
    // TEST 2: Validation of Required Fields
    // -----------------------------------------------------------------
    console.log('\n[Test 2] Validating Required Fields & Error Handling...');
    try {
      await axios.post(`${BASE_URL}/profile`, {
        name: '',
        available_capital: 100000
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'Empty name should be rejected with 400');
    } catch (err) {
      assert(err.response?.status === 400, 'Empty name correctly rejected with 400 Bad Request');
    }

    try {
      await axios.post(`${BASE_URL}/profile`, {
        name: 'Sunita Devi',
        available_capital: -5000
      }, {
        headers: { Authorization: `Bearer ${tokenA}` }
      });
      assert(false, 'Negative capital should be rejected with 400');
    } catch (err) {
      assert(err.response?.status === 400, 'Negative available_capital correctly rejected with 400 Bad Request');
    }

    // -----------------------------------------------------------------
    // TEST 3: User A Profile Creation (POST /api/profile)
    // -----------------------------------------------------------------
    console.log('\n[Test 3] Creating User A Profile (POST /api/profile)...');
    const profilePayloadA = {
      name: 'Sunita Devi',
      phone: '9876543210',
      social_category: 'OBC',
      gender: 'FEMALE',
      annual_family_income: 240000.0,
      available_capital: 350000.0,
      liquid_reserve: 40000.0,
      land_acres: 2.5,
      has_shop_building: false,
      has_vehicle: true,
      has_machinery: true,
      has_electricity: true,
      has_water_source: true,
      has_internet: true,
      has_storage_facility: false,
      skills: ['dairy_farming', 'food_processing'],
      experience_years: 5,
      business_interest: 'Organic Dairy and Milk Products',
      target_monthly_income: 35000.0,
      risk_preference: 'MODERATE',
      preferred_language: 'hi',
      village_name: 'Kankipadu',
      mandal_or_block: 'Kankipadu',
      district: 'Krishna',
      state: 'Andhra Pradesh',
      pincode: '521151',
      latitude: 16.4258,
      longitude: 80.7712,
      address: 'Near Panchayat Office, Main Road',
      analysis_radius_km: 12.0
    };

    const createResA = await axios.post(`${BASE_URL}/profile`, profilePayloadA, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(createResA.status === 200, 'Profile created successfully via POST /api/profile');
    assert(createResA.data.profile.hasProfile === true, 'Saved profile returns hasProfile: true');
    assert(createResA.data.profile.available_capital === 350000.0, 'Available capital matches submitted value (350000)');
    assert(createResA.data.profile.village_name === 'Kankipadu', 'Village name matches (Kankipadu)');

    // -----------------------------------------------------------------
    // TEST 4: Direct Supabase PostgreSQL Persistence Verification
    // -----------------------------------------------------------------
    console.log('\n[Test 4] Querying Supabase PostgreSQL directly to verify persistence...');
    const dbCheckRes = await db.query(
      `SELECT e.*, l.village_name, l.district, l.state, l.pincode
       FROM entrepreneurs e
       LEFT JOIN locations l ON e.location_id = l.id
       WHERE e.user_id = $1`,
      [userAId]
    );

    assert(dbCheckRes.rows.length === 1, 'Exactly one row found in PostgreSQL `entrepreneurs` table for User A');
    const dbRow = dbCheckRes.rows[0];
    assert(dbRow.name === 'Sunita Devi', 'Database row name matches "Sunita Devi"');
    assert(parseFloat(dbRow.available_capital) === 350000.0, 'Database row available_capital matches 350000.0');
    assert(dbRow.gender === 'FEMALE', 'Database row gender matches FEMALE');
    assert(dbRow.village_name === 'Kankipadu', 'Database location village_name matches "Kankipadu"');
    assert(Array.isArray(dbRow.skills) && dbRow.skills.includes('dairy_farming'), 'Database row skills contains "dairy_farming"');

    // -----------------------------------------------------------------
    // TEST 5: Authenticated Profile Retrieval (GET /api/profile)
    // -----------------------------------------------------------------
    console.log('\n[Test 5] Retrieving profile via authenticated GET /api/profile...');
    const getResA = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(getResA.status === 200, 'GET /api/profile returned 200 OK');
    assert(getResA.data.hasProfile === true, 'Profile indicates hasProfile: true');
    assert(getResA.data.name === 'Sunita Devi', 'Retrieved name is "Sunita Devi"');
    assert(getResA.data.available_capital === 350000.0, 'Retrieved available capital is 350000.0');
    assert(getResA.data.district === 'Krishna', 'Retrieved district is "Krishna"');
    assert(getResA.data.skills.includes('food_processing'), 'Retrieved skills contains "food_processing"');

    // -----------------------------------------------------------------
    // TEST 6: Profile Update (PUT /api/profile) & No Duplicate Rows
    // -----------------------------------------------------------------
    console.log('\n[Test 6] Updating Profile (PUT /api/profile) and checking for duplicate rows...');
    const updatePayloadA = {
      ...profilePayloadA,
      available_capital: 500000.0,
      skills: ['dairy_farming', 'food_processing', 'retail_management'],
      village_name: 'Vijayawada Rural',
      district: 'Krishna',
      state: 'Andhra Pradesh'
    };

    const updateResA = await axios.put(`${BASE_URL}/profile`, updatePayloadA, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });

    assert(updateResA.status === 200, 'PUT /api/profile returned 200 OK');
    assert(updateResA.data.profile.available_capital === 500000.0, 'Updated available_capital reflects 500000.0');
    assert(updateResA.data.profile.skills.length === 3, 'Updated skills count is 3');

    // Check PostgreSQL database again for count and updated values
    const countCheck = await db.query(
      'SELECT COUNT(*)::int as total FROM entrepreneurs WHERE user_id = $1',
      [userAId]
    );
    assert(countCheck.rows[0].total === 1, 'PostgreSQL STILL has exactly 1 row for User A (No duplicates created)');

    const updatedDbRow = await db.query(
      `SELECT e.available_capital, e.skills, l.village_name
       FROM entrepreneurs e
       LEFT JOIN locations l ON e.location_id = l.id
       WHERE e.user_id = $1`,
      [userAId]
    );
    assert(parseFloat(updatedDbRow.rows[0].available_capital) === 500000.0, 'PostgreSQL database verified with new capital (500000)');
    assert(updatedDbRow.rows[0].village_name === 'Vijayawada Rural', 'PostgreSQL database verified with updated location ("Vijayawada Rural")');

    // -----------------------------------------------------------------
    // TEST 7: Cross-User Isolation (User B Registration & Retrieval)
    // -----------------------------------------------------------------
    console.log('\n[Test 7] Testing Cross-User Access Isolation...');
    const regBRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Ramesh Patel',
      email: userBEmail,
      phone: '9123456789',
      password: password,
      preferredLanguage: 'en'
    });
    tokenB = regBRes.data.token;
    userBId = regBRes.data.user.id;
    console.log(`       User B ID: ${userBId}`);

    // User B fetches their own profile
    const getResB = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    assert(getResB.status === 200, 'User B GET /api/profile returned 200 OK');
    assert(getResB.data.hasProfile === false, 'User B does NOT have a profile yet (hasProfile: false)');
    assert(getResB.data.name === 'Ramesh Patel', 'User B receives their own skeleton name ("Ramesh Patel")');
    assert(getResB.data.name !== 'Sunita Devi', 'CRITICAL: User B CANNOT see User A profile data ("Sunita Devi")');

    // -----------------------------------------------------------------
    // TEST 8: Cross-User Tampering & Modification Rejection
    // -----------------------------------------------------------------
    console.log('\n[Test 8] User B attempts to tamper with or overwrite User A profile...');
    // User B sends a profile payload containing User A's ID
    const maliciousPayload = {
      user_id: userAId,      // Attempting to spoof User A's ID!
      id: dbRow.id,          // Attempting to overwrite User A's record ID!
      name: 'Hacked By User B',
      available_capital: 9999999.0
    };

    const maliciousRes = await axios.post(`${BASE_URL}/profile`, maliciousPayload, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });

    assert(maliciousRes.status === 200, 'User B request processed');
    // Ensure User B's saved profile belongs to User B, not User A
    assert(maliciousRes.data.profile.user_id === userBId, 'Saved profile is scoped strictly to authenticated User B ID');
    assert(maliciousRes.data.profile.user_id !== userAId, 'Saved profile was NOT saved under User A ID');

    // Now verify User A's profile in PostgreSQL was NOT modified
    const verifyUserAPostgres = await db.query(
      'SELECT name, available_capital FROM entrepreneurs WHERE user_id = $1',
      [userAId]
    );
    assert(verifyUserAPostgres.rows[0].name === 'Sunita Devi', 'CRITICAL SECURITY: User A name remains untouched ("Sunita Devi")');
    assert(parseFloat(verifyUserAPostgres.rows[0].available_capital) === 500000.0, 'CRITICAL SECURITY: User A capital remains untouched (500000.0)');

    // -----------------------------------------------------------------
    // TEST 9: Unauthenticated Access Rejection
    // -----------------------------------------------------------------
    console.log('\n[Test 9] Testing Unauthenticated Access Rejection...');
    try {
      await axios.get(`${BASE_URL}/profile`);
      assert(false, 'Unauthenticated GET /api/profile should be rejected');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated GET /api/profile correctly rejected with 401 Unauthorized');
    }

    try {
      await axios.post(`${BASE_URL}/profile`, { name: 'Anonymous' });
      assert(false, 'Unauthenticated POST /api/profile should be rejected');
    } catch (err) {
      assert(err.response?.status === 401, 'Unauthenticated POST /api/profile correctly rejected with 401 Unauthorized');
    }

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log('\n========================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }

  } catch (error) {
    console.error('\n💥 Unexpected Test Failure:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTestSuite();
