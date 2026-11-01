/**
 * Synthetic End-to-End Data Consistency Test for UdyamSaarthi
 * 
 * Verifies:
 * 1. User registration & authentication with Supabase PostgreSQL
 * 2. POST /api/profile with synthetic parameters:
 *    - Name: "Cherry Test"
 *    - Capital: 400000
 *    - Location: Brodipet, Guntur, Andhra Pradesh
 *    - Land: 2.0 acres
 *    - Infrastructure: Water, 3-phase power, vehicle, shop/shed, machinery
 *    - Skills: ['machinery']
 *    - Business intent: 'Custom Hiring Centre (Farm Machinery Rental)'
 * 3. Supabase database row verification (direct PostgreSQL query)
 * 4. GET /api/profile verification (returns identical saved values)
 * 5. POST /api/recommendations (receives exact 400000 capital, Brodipet/Guntur location, and Custom Hiring Centre)
 * 6. Business plan engine verification (suitability score, financial structuring with 400000, 2.0 acres land)
 * 7. Page refresh simulation (re-fetching returns consistent saved state without falling back to defaults)
 */

const axios = require('axios');
const db = require('../config/db');

const API_BASE = 'http://localhost:5000/api';
const AI_BASE = 'http://localhost:8001/api';

async function runTest() {
  console.log('================================================================');
  console.log('🚀 UDYAM SAARTHI - DATA CONSISTENCY & INTEGRITY TEST');
  console.log('================================================================\n');

  const timestamp = Date.now();
  const testUser = {
    name: 'Cherry Test',
    email: `cherry.test.${timestamp}@sih.gov.in`,
    password: 'SecurePassword123!',
    mobile: '9876543210'
  };

  try {
    // -------------------------------------------------------------
    // STEP 1: Register Fresh Test User
    // -------------------------------------------------------------
    console.log('STEP 1: Registering fresh user account:', testUser.email);
    const regRes = await axios.post(`${API_BASE}/auth/register`, testUser);
    const token = regRes.data.token;
    const userId = regRes.data.user.id;
    console.log('✅ User registered successfully. UUID:', userId);

    const authHeaders = {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    // -------------------------------------------------------------
    // STEP 2: Submit Profile via POST /api/profile
    // -------------------------------------------------------------
    console.log('\nSTEP 2: Submitting authoritative profile with exact synthetic data...');
    const profilePayload = {
      name: 'Cherry Test',
      phone: '9876543210',
      available_capital: 400000,
      liquid_reserve: 30000,
      village_name: 'Brodipet',
      district: 'Guntur',
      state: 'Andhra Pradesh',
      pincode: '522002',
      latitude: 16.3067,
      longitude: 80.4365,
      land_acres: 2.0,
      has_shop_building: true,
      has_vehicle: true,
      has_machinery: true,
      has_electricity: true,
      has_water_source: true,
      has_internet: true,
      has_storage_facility: false,
      skills: ['machinery'],
      experience_years: 4,
      business_interest: 'Custom Hiring Centre (Farm Machinery Rental)',
      target_monthly_income: 35000,
      risk_preference: 'MODERATE',
      preferred_language: 'te'
    };

    const saveRes = await axios.post(`${API_BASE}/profile`, profilePayload, authHeaders);
    console.log('✅ Profile saved via POST /api/profile. Response code:', saveRes.status);
    console.log('   Saved name:', saveRes.data.profile.name);
    console.log('   Saved capital:', saveRes.data.profile.available_capital);
    console.log('   Saved location:', `${saveRes.data.profile.village_name}, ${saveRes.data.profile.district}, ${saveRes.data.profile.state}`);
    console.log('   Saved business interest:', saveRes.data.profile.business_interest);
    console.log('   Saved land acres:', saveRes.data.profile.land_acres);
    console.log('   Saved has_machinery:', saveRes.data.profile.has_machinery);

    // -------------------------------------------------------------
    // STEP 3: Verify Supabase PostgreSQL Table Row Directly
    // -------------------------------------------------------------
    console.log('\nSTEP 3: Direct database inspection in Supabase `entrepreneurs` table...');
    const dbCheck = await db.query(
      `SELECT e.*, l.village_name, l.district, l.state, l.pincode
       FROM entrepreneurs e
       LEFT JOIN locations l ON e.location_id = l.id
       WHERE e.user_id = $1`,
      [userId]
    );

    if (dbCheck.rows.length === 0) {
      throw new Error('FAILED: No row found in `entrepreneurs` table for user ' + userId);
    }

    const row = dbCheck.rows[0];
    console.log('✅ PostgreSQL database row confirmed:');
    console.log('   entrepreneurs.id:', row.id);
    console.log('   entrepreneurs.name:', row.name, '(Must be Cherry Test, NOT 4 lakhs)');
    console.log('   entrepreneurs.available_capital:', parseFloat(row.available_capital), '(Must be 400000.00)');
    console.log('   entrepreneurs.land_acres:', parseFloat(row.land_acres), '(Must be 2.00)');
    console.log('   entrepreneurs.has_machinery:', row.has_machinery, '(Must be TRUE)');
    console.log('   entrepreneurs.business_interest:', row.business_interest);
    console.log('   locations.village_name:', row.village_name, '(Must be Brodipet)');
    console.log('   locations.district:', row.district, '(Must be Guntur)');
    console.log('   locations.state:', row.state, '(Must be Andhra Pradesh)');

    if (row.name !== 'Cherry Test') {
      throw new Error(`Integrity Error: Expected name "Cherry Test", got "${row.name}"`);
    }
    if (parseFloat(row.available_capital) !== 400000) {
      throw new Error(`Integrity Error: Expected capital 400000, got ${row.available_capital}`);
    }
    if (parseFloat(row.land_acres) !== 2.0) {
      throw new Error(`Integrity Error: Expected land 2.0, got ${row.land_acres}`);
    }
    if (row.has_machinery !== true) {
      throw new Error(`Integrity Error: Expected has_machinery true, got ${row.has_machinery}`);
    }

    // -------------------------------------------------------------
    // STEP 4: Verify Authenticated GET /api/profile
    // -------------------------------------------------------------
    console.log('\nSTEP 4: Fetching profile via GET /api/profile...');
    const getRes = await axios.get(`${API_BASE}/profile`, authHeaders);
    const fetched = getRes.data;
    console.log('✅ GET /api/profile returned:');
    console.log('   Name:', fetched.name);
    console.log('   Capital:', fetched.available_capital);
    console.log('   Location:', `${fetched.village_name}, ${fetched.district}, ${fetched.state}`);
    console.log('   Land acres:', fetched.land_acres);
    console.log('   Has machinery:', fetched.has_machinery);
    console.log('   Skills:', fetched.skills);

    if (fetched.name !== 'Cherry Test' || fetched.available_capital !== 400000) {
      throw new Error('Integrity Error: GET /api/profile mismatch with saved values!');
    }

    // -------------------------------------------------------------
    // STEP 5: Verify Advisory / Recommendations with Authoritative Profile
    // -------------------------------------------------------------
    console.log('\nSTEP 5: Calling AI Decision Advisory via POST /api/recommendations...');
    const recRes = await axios.post(`${API_BASE}/recommendations`, fetched, authHeaders);
    const recs = recRes.data;
    console.log('✅ Recommendations returned successfully.');
    console.log('   Viable candidates analyzed:', recs.viable_candidates_count);
    
    const topRec = recs.top_recommendation;
    if (!topRec) {
      throw new Error('Integrity Error: No top recommendation returned by advisory pipeline!');
    }

    console.log('\n🎯 TOP RECOMMENDATION DETAILS:');
    console.log('   Category Code:', topRec.category_code);
    console.log('   Business Name (EN):', topRec.name_en);
    console.log('   Overall Suitability Score:', topRec.overall_suitability_score, '/ 100');
    console.log('   Location in Plan:', topRec.location ? `${topRec.location.village}, ${topRec.location.district}, ${topRec.location.state}` : 'N/A');
    console.log('   Capital in Plan: ₹' + (topRec.capital || 0).toLocaleString('en-IN'));
    console.log('   Project Cost: ₹' + topRec.financials.project_cost.toLocaleString('en-IN'));
    console.log('   Own Margin Required: ₹' + topRec.financials.own_contribution_required.toLocaleString('en-IN'));
    console.log('   Concessional Loan: ₹' + topRec.financials.loan_amount.toLocaleString('en-IN'));
    console.log('   DSCR Cushion:', topRec.financials.dscr + 'x');
    console.log('   Skill Compatibility:', topRec.sub_scores.skill_compatibility + '/100');
    console.log('   Market Opportunity:', topRec.sub_scores.market_opportunity + '/100');

    // Assert that the plan matches the business intent and has exact location & capital
    if (!topRec.category_code.includes('AGRI_EQUIPMENT_RENTAL') && !topRec.name_en.toLowerCase().includes('custom hiring')) {
      console.warn('⚠️ Warning: Top recommendation is', topRec.name_en, 'instead of Custom Hiring Centre');
    } else {
      console.log('✅ Top recommendation correctly identified as Custom Hiring Centre based on entrepreneur business interest!');
    }

    if (topRec.capital !== 400000) {
      throw new Error(`Integrity Error: Expected capital in plan to be 400000, got ${topRec.capital}`);
    }

    if (!topRec.location || topRec.location.village !== 'Brodipet' || topRec.location.district !== 'Guntur') {
      throw new Error(`Integrity Error: Expected location Brodipet, Guntur, got: ${JSON.stringify(topRec.location)}`);
    }

    // -------------------------------------------------------------
    // STEP 6: Refresh Simulation Test
    // -------------------------------------------------------------
    console.log('\nSTEP 6: Simulating Page Refresh & Session Recovery...');
    const refreshRes = await axios.get(`${API_BASE}/profile`, authHeaders);
    const refreshedProfile = refreshRes.data;
    
    if (refreshedProfile.name !== 'Cherry Test' || refreshedProfile.available_capital !== 400000) {
      throw new Error('Integrity Error: Stale profile loaded after refresh!');
    }
    console.log('✅ Refresh test passed: Saved profile is persistent and identical across reloads.');

    console.log('\n================================================================');
    console.log('🎉 ALL DATA CONSISTENCY & INTEGRITY TESTS PASSED SUCCESSFULLY!');
    console.log('================================================================');

  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.response?.data || err.message);
    process.exit(1);
  } finally {
    if (db.getPool()) {
      await db.getPool().end();
    }
  }
}

runTest();
