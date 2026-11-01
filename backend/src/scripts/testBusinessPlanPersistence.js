/**
 * Comprehensive Business Plan Persistence & Isolation Test for UdyamSaarthi
 * 
 * Tests:
 * 1. User 1 Registration & Profile Setup
 * 2. User 2 Registration & Profile Setup
 * 3. POST /api/business-plans for User 1 (Plan A: Custom Hiring Centre, ₹4,00,000)
 * 4. POST /api/business-plans for User 1 (Plan B: Mini Flour & Spice Mill, ₹2,50,000)
 * 5. Verify multiple plans do not overwrite (User 1 has 2 distinct plans)
 * 6. User Isolation:
 *    - User 2 GET /api/business-plans returns 0 plans
 *    - User 2 GET /api/business-plans/:id (User 1's plan) returns 404
 *    - User 2 PUT /api/business-plans/:id (User 1's plan) returns 404
 *    - User 2 DELETE /api/business-plans/:id (User 1's plan) returns 404
 * 7. PUT /api/business-plans/:id for User 1 (Updates Plan A)
 * 8. GET /api/business-plans/:id for User 1 (Verifies updated fields)
 * 9. DELETE /api/business-plans/:id for User 1 (Deletes Plan B)
 * 10. Persistence after Logout and Re-Login with User 1
 * 11. Direct Supabase PostgreSQL Table Inspection
 */

const axios = require('axios');
const db = require('../config/db');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('================================================================');
  console.log('🚀 PHASE 2: BUSINESS PLAN PERSISTENCE & USER ISOLATION TEST');
  console.log('================================================================\n');

  const ts = Date.now();
  const user1Data = {
    name: 'Entrepreneur One',
    email: `ent.one.${ts}@sih.gov.in`,
    password: 'Password123!',
    mobile: '9111111111'
  };

  const user2Data = {
    name: 'Entrepreneur Two',
    email: `ent.two.${ts}@sih.gov.in`,
    password: 'Password123!',
    mobile: '9222222222'
  };

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Register User 1 & User 2
    // -------------------------------------------------------------------------
    console.log('STEP 1: Registering User 1 & User 2...');
    const reg1 = await axios.post(`${API_BASE}/auth/register`, user1Data);
    const token1 = reg1.data.token;
    const user1Id = reg1.data.user.id;
    console.log(`  ✓ User 1 registered. UUID: ${user1Id} (${user1Data.email})`);

    const reg2 = await axios.post(`${API_BASE}/auth/register`, user2Data);
    const token2 = reg2.data.token;
    const user2Id = reg2.data.user.id;
    console.log(`  ✓ User 2 registered. UUID: ${user2Id} (${user2Data.email})`);

    const headers1 = { headers: { Authorization: `Bearer ${token1}` } };
    const headers2 = { headers: { Authorization: `Bearer ${token2}` } };

    // -------------------------------------------------------------------------
    // STEP 2: Save Profiles for both users
    // -------------------------------------------------------------------------
    console.log('\nSTEP 2: Initializing Entrepreneur Profiles in PostgreSQL...');
    await axios.post(`${API_BASE}/profile`, {
      name: 'Entrepreneur One',
      available_capital: 400000,
      village_name: 'Brodipet',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      business_interest: 'Custom Hiring Centre (Farm Machinery Rental)'
    }, headers1);
    console.log('  ✓ User 1 profile saved.');

    await axios.post(`${API_BASE}/profile`, {
      name: 'Entrepreneur Two',
      available_capital: 150000,
      village_name: 'Kankavli',
      district: 'Sindhudurg',
      state: 'Maharashtra',
      business_interest: 'Mushroom Farming'
    }, headers2);
    console.log('  ✓ User 2 profile saved.');

    // -------------------------------------------------------------------------
    // STEP 3: Save Plan A for User 1
    // -------------------------------------------------------------------------
    console.log('\nSTEP 3: Saving Plan A for User 1 via POST /api/business-plans...');
    const planAPayload = {
      plan_title: 'Custom Hiring Centre (Farm Machinery Rental)',
      business_type: 'CUSTOM_HIRING_CENTRE',
      capital: 400000,
      location: {
        village: 'Brodipet',
        district: 'Guntur',
        state: 'Andhra Pradesh',
        latitude: 16.3067,
        longitude: 80.4365
      },
      status: 'ACTIVE',
      financial_details: {
        project_cost: 600000,
        own_contribution_required: 60000,
        loan_amount: 540000,
        interest_rate_pct: 8.0,
        tenure_years: 7,
        moratorium_months: 6,
        monthly_emi: 7018,
        projected_monthly_revenue: 78000,
        projected_monthly_operating_profit: 42000,
        dscr: 4.99
      },
      plan_content: {
        category_code: 'CUSTOM_HIRING_CENTRE',
        overall_suitability_score: 96.0,
        confidence_score: 94.0,
        description: 'Tractor, rotavator, power tiller & harvester rental hub.',
        why_recommended_en: 'High hyper-local demand with 2 acres land and machinery assets available.'
      }
    };

    const saveARes = await axios.post(`${API_BASE}/business-plans`, planAPayload, headers1);
    if (saveARes.status !== 201) throw new Error(`Expected 201, got ${saveARes.status}`);
    const planA = saveARes.data.plan;
    console.log(`  ✓ Plan A saved successfully. ID: ${planA.id}`);
    console.log(`    Title: "${planA.plan_title}" | Capital: ₹${planA.capital.toLocaleString('en-IN')}`);
    console.log(`    Location: ${planA.location.village}, ${planA.location.district}`);

    // -------------------------------------------------------------------------
    // STEP 4: Save Plan B for User 1 (Multi-plan support)
    // -------------------------------------------------------------------------
    console.log('\nSTEP 4: Saving Plan B for User 1 (Verifying multiple plans don\'t overwrite)...');
    const planBPayload = {
      plan_title: 'Mini Flour, Spices & Oil Expeller Mill',
      business_type: 'FOOD_PROCESSING_MILL',
      capital: 250000,
      location: {
        village: 'Brodipet',
        district: 'Guntur',
        state: 'Andhra Pradesh'
      },
      status: 'ACTIVE',
      financial_details: {
        project_cost: 350000,
        own_contribution_required: 35000,
        loan_amount: 315000,
        monthly_emi: 4200,
        projected_monthly_revenue: 52000,
        projected_monthly_operating_profit: 23000,
        dscr: 3.8
      },
      plan_content: {
        overall_suitability_score: 88.5,
        confidence_score: 90.0,
        description: 'Motorized pulverizer and mini expeller.'
      }
    };

    const saveBRes = await axios.post(`${API_BASE}/business-plans`, planBPayload, headers1);
    const planB = saveBRes.data.plan;
    console.log(`  ✓ Plan B saved successfully. ID: ${planB.id}`);

    if (planA.id === planB.id) {
      throw new Error('Integrity Error: Plan A and Plan B received identical IDs!');
    }

    // -------------------------------------------------------------------------
    // STEP 5: Verify User 1 has both distinct plans
    // -------------------------------------------------------------------------
    console.log('\nSTEP 5: Fetching User 1 plans via GET /api/business-plans...');
    const list1Res = await axios.get(`${API_BASE}/business-plans`, headers1);
    const user1Plans = list1Res.data.plans;
    console.log(`  ✓ Retrieved ${user1Plans.length} plan(s) for User 1.`);
    if (user1Plans.length !== 2) {
      throw new Error(`Expected exactly 2 plans for User 1, got ${user1Plans.length}`);
    }

    const hasPlanA = user1Plans.some(p => p.id === planA.id);
    const hasPlanB = user1Plans.some(p => p.id === planB.id);
    if (!hasPlanA || !hasPlanB) {
      throw new Error('Integrity Error: User 1 plans list missing Plan A or Plan B!');
    }
    console.log('  ✓ Verified: Generating Plan B did not overwrite Plan A.');

    // -------------------------------------------------------------------------
    // STEP 6: User Isolation Verification
    // -------------------------------------------------------------------------
    console.log('\nSTEP 6: Testing User Isolation & Authorization Security...');
    
    // 6a: User 2 gets own plans (should be 0)
    const list2Res = await axios.get(`${API_BASE}/business-plans`, headers2);
    if (list2Res.data.plans.length !== 0) {
      throw new Error(`Isolation Breach: User 2 sees ${list2Res.data.plans.length} plans belonging to someone else!`);
    }
    console.log('  ✓ User 2 GET /api/business-plans returns 0 plans (isolated from User 1).');

    // 6b: User 2 attempts to read User 1's Plan A
    try {
      await axios.get(`${API_BASE}/business-plans/${planA.id}`, headers2);
      throw new Error('Security Error: User 2 was able to read User 1\'s plan!');
    } catch (err) {
      if (err.response?.status === 404) {
        console.log('  ✓ User 2 GET /api/business-plans/:planA_id correctly returned 404 (Access denied).');
      } else {
        throw new Error(`Expected 404 for cross-user GET, got ${err.response?.status}`);
      }
    }

    // 6c: User 2 attempts to update User 1's Plan A
    try {
      await axios.put(`${API_BASE}/business-plans/${planA.id}`, { plan_title: 'Hacked Title' }, headers2);
      throw new Error('Security Error: User 2 was able to update User 1\'s plan!');
    } catch (err) {
      if (err.response?.status === 404) {
        console.log('  ✓ User 2 PUT /api/business-plans/:planA_id correctly returned 404 (Access denied).');
      } else {
        throw new Error(`Expected 404 for cross-user PUT, got ${err.response?.status}`);
      }
    }

    // 6d: User 2 attempts to delete User 1's Plan A
    try {
      await axios.delete(`${API_BASE}/business-plans/${planA.id}`, headers2);
      throw new Error('Security Error: User 2 was able to delete User 1\'s plan!');
    } catch (err) {
      if (err.response?.status === 404) {
        console.log('  ✓ User 2 DELETE /api/business-plans/:planA_id correctly returned 404 (Access denied).');
      } else {
        throw new Error(`Expected 404 for cross-user DELETE, got ${err.response?.status}`);
      }
    }

    // -------------------------------------------------------------------------
    // STEP 7: Update Plan A (PUT /api/business-plans/:id)
    // -------------------------------------------------------------------------
    console.log('\nSTEP 7: Updating Plan A as User 1 via PUT /api/business-plans/:id...');
    const updateRes = await axios.put(`${API_BASE}/business-plans/${planA.id}`, {
      plan_title: 'Custom Hiring Centre (Farm Machinery Rental) - Approved',
      status: 'APPROVED',
      capital: 420000
    }, headers1);

    if (updateRes.status !== 200) throw new Error(`Expected 200, got ${updateRes.status}`);
    const updatedPlanA = updateRes.data.plan;
    console.log(`  ✓ Plan A updated. New Title: "${updatedPlanA.plan_title}" | Status: ${updatedPlanA.status} | Capital: ₹${updatedPlanA.capital}`);
    if (updatedPlanA.status !== 'APPROVED' || updatedPlanA.capital !== 420000) {
      throw new Error('Integrity Error: Updated fields do not match submitted values.');
    }

    // -------------------------------------------------------------------------
    // STEP 8: Fetch specific plan by ID (GET /api/business-plans/:id)
    // -------------------------------------------------------------------------
    console.log('\nSTEP 8: Fetching single plan via GET /api/business-plans/:id...');
    const getSingleRes = await axios.get(`${API_BASE}/business-plans/${planA.id}`, headers1);
    const fetchedA = getSingleRes.data.plan;
    console.log(`  ✓ Retrieved plan: "${fetchedA.plan_title}" (Status: ${fetchedA.status})`);
    if (fetchedA.id !== planA.id || fetchedA.plan_title !== 'Custom Hiring Centre (Farm Machinery Rental) - Approved') {
      throw new Error('Integrity Error: Fetched plan does not reflect recent update.');
    }

    // -------------------------------------------------------------------------
    // STEP 9: Delete Plan B (DELETE /api/business-plans/:id)
    // -------------------------------------------------------------------------
    console.log('\nSTEP 9: Deleting Plan B as User 1 via DELETE /api/business-plans/:id...');
    const delRes = await axios.delete(`${API_BASE}/business-plans/${planB.id}`, headers1);
    console.log(`  ✓ Delete response: ${delRes.data.message} (Deleted ID: ${delRes.data.id})`);

    const listAfterDel = await axios.get(`${API_BASE}/business-plans`, headers1);
    console.log(`  ✓ Remaining plans for User 1: ${listAfterDel.data.plans.length}`);
    if (listAfterDel.data.plans.length !== 1 || listAfterDel.data.plans[0].id !== planA.id) {
      throw new Error('Integrity Error: Expected exactly Plan A remaining after deleting Plan B.');
    }

    // -------------------------------------------------------------------------
    // STEP 10: Persistence after Logout and Re-Login
    // -------------------------------------------------------------------------
    console.log('\nSTEP 10: Testing Persistence after Re-Login...');
    const reLoginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: user1Data.email,
      password: user1Data.password
    });
    const newToken1 = reLoginRes.data.token;
    console.log('  ✓ Re-authenticated successfully with User 1 credentials.');

    const reFetchRes = await axios.get(`${API_BASE}/business-plans`, {
      headers: { Authorization: `Bearer ${newToken1}` }
    });
    const restoredPlans = reFetchRes.data.plans;
    if (restoredPlans.length !== 1 || restoredPlans[0].id !== planA.id) {
      throw new Error('Integrity Error: Saved plan failed to persist across session re-login!');
    }
    console.log(`  ✓ Re-login persistence confirmed: 1 saved plan found ("${restoredPlans[0].plan_title}").`);

    // -------------------------------------------------------------------------
    // STEP 11: Direct PostgreSQL Row Inspection in Supabase
    // -------------------------------------------------------------------------
    console.log('\nSTEP 11: Direct PostgreSQL Table Inspection in Supabase...');
    const dbRows = await db.query(
      `SELECT id, user_id, business_type, plan_title, capital, status, created_at, updated_at
       FROM business_plans
       WHERE user_id = $1`,
      [user1Id]
    );

    console.log(`  ✓ PostgreSQL rows in \`business_plans\` table for user ${user1Id}: ${dbRows.rows.length}`);
    const row = dbRows.rows[0];
    console.log('    Row ID:', row.id);
    console.log('    User ID:', row.user_id);
    console.log('    Business Type:', row.business_type);
    console.log('    Plan Title:', row.plan_title);
    console.log('    Capital:', parseFloat(row.capital));
    console.log('    Status:', row.status);
    console.log('    Created At:', row.created_at);
    console.log('    Updated At:', row.updated_at);

    console.log('\n================================================================');
    console.log('🎉 ALL BUSINESS PLAN PERSISTENCE & SECURITY TESTS PASSED!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    if (db.getPool()) {
      await db.getPool().end();
    }
  }
}

runTests();
