const axios = require('axios');
const db = require('../config/db');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 TESTING BUSINESS PLAN DEDUPLICATION, PERSISTENCE & DATA INTEGRITY');
  console.log('======================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, name) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      throw new Error(`Assertion failed: ${name}`);
    }
  }

  try {
    // 1. Authenticate user kisan@sih.gov.in via demo-login
    console.log('--- Step 1: Login as authentic user (kisan@sih.gov.in) ---');
    const loginRes = await axios.post(`${API_BASE}/auth/demo-login`);
    assert(loginRes.status === 200 && loginRes.data.token, 'User logged in and received JWT token');
    const token = loginRes.data.token;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    const userId = loginRes.data.user.id;
    console.log(`Authenticated as: ${loginRes.data.user.email} (UUID: ${userId})`);

    // 2. Retrieve initial saved plans
    console.log('\n--- Step 2: Retrieve initial saved plans via GET /api/business-plans ---');
    const getInitial = await axios.get(`${API_BASE}/business-plans`, authHeaders);
    assert(getInitial.status === 200, 'GET /api/business-plans returned 200');
    assert(Array.isArray(getInitial.data.plans), 'Returned plans is an array');
    console.log(`Current saved plans count: ${getInitial.data.plans.length}`);
    getInitial.data.plans.forEach((p, idx) => {
      console.log(`  [${idx}] ${p.plan_title} (${p.business_type}) - UUID: ${p.id} - Capital: ₹${p.capital}`);
    });
    
    // Check that there are no duplicate business_types initially
    const typeSet = new Set(getInitial.data.plans.map(p => p.business_type));
    assert(typeSet.size === getInitial.data.plans.length, 'Each existing plan has a distinct business_type (no duplicates)');

    // 3. Save a new distinct business plan (POULTRY_FARMING)
    console.log('\n--- Step 3: Save a new distinct business recommendation (POULTRY_FARMING) ---');
    const poultryPayload = {
      plan_title: 'Desi Poultry & Broiler Rearing Unit',
      business_type: 'POULTRY_FARMING',
      capital: 250000,
      location: {
        village: 'Brodipet',
        district: 'Guntur',
        state: 'Andhra Pradesh'
      },
      financial_details: {
        project_cost: 350000,
        own_contribution_required: 35000,
        loan_amount: 315000,
        monthly_emi: 4900,
        monthly_revenue: 65000,
        dscr: 2.20
      },
      plan_content: {
        businessName: 'Desi Poultry & Broiler Rearing Unit',
        category: 'POULTRY_FARMING',
        suitabilityScore: 88.5,
        confidenceScore: 91.0,
        why_recommended_en: 'Strong regional demand for organic desi poultry meat with 35-day rotation cycles.'
      }
    };

    const savePoultryRes = await axios.post(`${API_BASE}/business-plans`, poultryPayload, authHeaders);
    assert(savePoultryRes.status === 201 || savePoultryRes.status === 200, 'Saved poultry plan successfully');
    const poultryPlan = savePoultryRes.data.plan;
    assert(poultryPlan.id && poultryPlan.business_type === 'POULTRY_FARMING', 'Poultry plan has valid UUID and correct business_type');
    const poultryId = poultryPlan.id;
    console.log(`Saved Poultry Plan UUID: ${poultryId}`);

    // 4. Repeated save of CUSTOM_HIRING_CENTRE (must NOT create a duplicate row)
    console.log('\n--- Step 4: Repeated save of CUSTOM_HIRING_CENTRE (must update existing, NOT duplicate) ---');
    const customHiringPayload = {
      plan_title: 'Custom Hiring Centre (Farm Machinery Rental) - Updated',
      business_type: 'CUSTOM_HIRING_CENTRE',
      capital: 400000,
      location: {
        village: 'Brodipet',
        district: 'Guntur',
        state: 'Andhra Pradesh'
      },
      financial_details: {
        project_cost: 500000,
        own_contribution_required: 50000,
        loan_amount: 450000,
        monthly_emi: 7018,
        monthly_revenue: 85000,
        dscr: 2.15
      },
      plan_content: {
        businessName: 'Custom Hiring Centre (Farm Machinery Rental) - Updated',
        category: 'CUSTOM_HIRING_CENTRE',
        suitabilityScore: 92.4,
        confidenceScore: 94.0
      }
    };

    const duplicateAttemptRes = await axios.post(`${API_BASE}/business-plans`, customHiringPayload, authHeaders);
    assert(duplicateAttemptRes.status === 200, 'Repeated save returned 200 (updated existing plan rather than duplicating)');
    assert(duplicateAttemptRes.data.plan.business_type === 'CUSTOM_HIRING_CENTRE', 'Updated plan retains CUSTOM_HIRING_CENTRE');
    console.log(`Updated Custom Hiring Centre UUID: ${duplicateAttemptRes.data.plan.id}`);

    // 5. Query all plans and verify exact counts and business types
    console.log('\n--- Step 5: Verify exact counts and deduplication via GET /api/business-plans ---');
    const getAfterSave = await axios.get(`${API_BASE}/business-plans`, authHeaders);
    const plans = getAfterSave.data.plans;
    console.log(`Total plans after saves: ${plans.length}`);
    plans.forEach((p, idx) => {
      console.log(`  [${idx}] ${p.plan_title} | Type: ${p.business_type} | ID: ${p.id} | Capital: ₹${p.capital}`);
    });

    const categories = plans.map(p => p.business_type);
    const uniqueCategories = new Set(categories);
    assert(uniqueCategories.size === plans.length, 'No duplicate business_types exist in saved plans');
    assert(categories.includes('CUSTOM_HIRING_CENTRE'), 'Contains CUSTOM_HIRING_CENTRE');
    assert(categories.includes('MUSHROOM_FARMING'), 'Contains MUSHROOM_FARMING');
    assert(categories.includes('POULTRY_FARMING'), 'Contains POULTRY_FARMING');

    // 6. Test opening individual plan by ID (ensure each plan retains its own data)
    console.log('\n--- Step 6: Test opening each plan individually by ID ---');
    for (const p of plans) {
      const singleRes = await axios.get(`${API_BASE}/business-plans/${p.id}`, authHeaders);
      assert(singleRes.status === 200, `GET /api/business-plans/${p.id} returned 200`);
      assert(singleRes.data.plan.id === p.id, `Plan ID matches ${p.id}`);
      assert(singleRes.data.plan.business_type === p.business_type, `Business type matches ${p.business_type}`);
      assert(singleRes.data.plan.rawRecommendation.name_en === p.plan_title, `rawRecommendation.name_en matches ${p.plan_title}`);
      console.log(`  Verified Plan ${p.id}: "${singleRes.data.plan.plan_title}" (${singleRes.data.plan.business_type})`);
    }

    // 7. Verify direct Supabase database row count for this user
    console.log('\n--- Step 7: Verify direct Supabase PostgreSQL database rows ---');
    const dbRows = await db.query(
      'SELECT id, business_type, plan_title, capital, created_at FROM business_plans WHERE user_id = $1 ORDER BY created_at ASC',
      [userId]
    );
    console.log(`Database row count for user: ${dbRows.rows.length}`);
    console.table(dbRows.rows);
    assert(dbRows.rows.length === plans.length, 'Database row count exactly matches frontend plans count');

    // 8. Re-login test: Simulate logging out and logging back in
    console.log('\n--- Step 8: Re-login test (Persistence across fresh session) ---');
    const reLogin = await axios.post(`${API_BASE}/auth/demo-login`);
    const freshToken = reLogin.data.token;
    const freshPlansRes = await axios.get(`${API_BASE}/business-plans`, {
      headers: { Authorization: `Bearer ${freshToken}` }
    });
    assert(freshPlansRes.data.plans.length === plans.length, 'Plans count is identical after re-login');
    assert(freshPlansRes.data.plans.some(p => p.id === poultryId), 'Newly saved poultry plan persists across sessions');

    // 9. User isolation test: Register a new user and ensure they cannot see this user's plans
    console.log('\n--- Step 9: User Isolation Test (Multi-tenant security) ---');
    const otherEmail = `isolation.check.${Date.now()}@sih.gov.in`;
    const otherUserRes = await axios.post(`${API_BASE}/auth/register`, {
      name: 'Other User',
      email: otherEmail,
      password: 'Password123!',
      preferred_language: 'en'
    });
    const otherToken = otherUserRes.data.token;
    const otherPlansRes = await axios.get(`${API_BASE}/business-plans`, {
      headers: { Authorization: `Bearer ${otherToken}` }
    });
    assert(otherPlansRes.data.plans.length === 0, 'New user starts with 0 business plans (strict user isolation)');

    // Attempting to access first user's plan by ID returns 404
    try {
      await axios.get(`${API_BASE}/business-plans/${poultryId}`, {
        headers: { Authorization: `Bearer ${otherToken}` }
      });
      assert(false, 'Cross-user plan access should throw 404');
    } catch (err) {
      assert(err.response?.status === 404, 'Cross-user plan access correctly rejected with 404 Not Found');
    }

    console.log('\n======================================================================');
    console.log(`🎉 ALL ${passed}/${total} DEDUPLICATION & INTEGRITY TESTS PASSED SUCCESSFULLY!`);
    console.log('======================================================================');

    if (db.getPool()) await db.getPool().end();
  } catch (err) {
    console.error('Test execution error:', err.message);
    if (db.getPool()) await db.getPool().end();
    process.exit(1);
  }
}

runTests();
