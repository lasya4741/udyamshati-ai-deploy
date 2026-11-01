const axios = require('axios');

async function runTest() {
  console.log('===============================================================');
  console.log('🧪 TEST: Ganesh Profile Advisory & Capital Consistency Verification');
  console.log('===============================================================');

  const BASE_URL = 'http://localhost:5000';
  const syntheticEmail = `ganesh_synth_${Date.now()}@test.gov.in`;

  // 1. Register fresh synthetic account
  console.log(`\n1. Creating fresh synthetic account: ${syntheticEmail}`);
  const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
    fullName: 'Ganesh',
    email: syntheticEmail,
    password: 'Password@123',
    phone: '9876543210'
  });
  const token = regRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✓ Account registered and authenticated.');

  // 2. Save Ganesh profile
  console.log('\n2. Saving profile:');
  const ganeshProfile = {
    name: 'Ganesh',
    village_name: 'Mogri Rural',
    district: 'Anand',
    state: 'Gujarat',
    available_capital: 300000,
    land_acres: 1,
    business_interest: 'Commercial Dairy Farming',
    skills: ['retail', 'food_processing', 'machinery', 'goat_farming'],
    has_electricity: true,
    has_water_source: true,
    social_category: 'OBC',
    gender: 'MALE',
    pincode: '' // No PIN provided
  };

  const profileSaveRes = await axios.post(`${BASE_URL}/api/profile`, ganeshProfile, { headers: authHeaders });
  const savedProf = profileSaveRes.data.profile || profileSaveRes.data;
  console.log('✓ Profile Saved to Supabase:');
  console.log(`  - Name: ${savedProf.name}`);
  console.log(`  - Location: ${savedProf.village_name}, ${savedProf.district}, ${savedProf.state}`);
  console.log(`  - PIN: "${savedProf.pincode}" (Expected: empty/unavailable, NOT 522002)`);
  console.log(`  - Available Capital: ₹${savedProf.available_capital?.toLocaleString('en-IN')}`);
  console.log(`  - Business Interest: ${savedProf.business_interest}`);
  console.log(`  - Skills: ${savedProf.skills?.join(', ')}`);

  // Assertions for Issue 2 & Issue 3 on profile
  if (savedProf.available_capital !== 300000) {
    throw new Error(`Available capital mismatch in saved profile: expected 300000, got ${savedProf.available_capital}`);
  }
  if (savedProf.pincode === '522002') {
    throw new Error(`Stale PIN 522002 detected for Gujarat location!`);
  }
  if (savedProf.state !== 'Gujarat' || savedProf.district !== 'Anand' || savedProf.village_name !== 'Mogri Rural') {
    throw new Error(`Location mismatch in saved profile: ${savedProf.village_name}, ${savedProf.district}, ${savedProf.state}`);
  }

  // 3. Generate Advisory
  console.log('\n3. Generating Business Advisory via AI Recommendation Engine:');
  const advRes = await axios.post(`${BASE_URL}/api/recommendations`, savedProf, { headers: authHeaders });
  const topRec = advRes.data.top_recommendation;
  console.log('✓ Advisory Generated:');
  console.log(`  - Primary Recommended Business: ${topRec.name_en}`);
  console.log(`  - Category Code: ${topRec.category_code}`);
  console.log(`  - Suitability Score: ${topRec.overall_suitability_score}/100`);
  console.log(`  - Entrepreneur Capital: ₹${(topRec.capital || advRes.data.capital)?.toLocaleString('en-IN')}`);
  console.log(`  - Calculated Project Cost: ₹${topRec.financials?.project_cost?.toLocaleString('en-IN')}`);
  console.log(`  - Beneficiary Own Margin (10%): ₹${topRec.financials?.own_contribution_required?.toLocaleString('en-IN')}`);
  console.log(`  - Concessional Loan (90%): ₹${topRec.financials?.loan_amount?.toLocaleString('en-IN')}`);
  console.log(`  - Monthly EMI: ₹${topRec.financials?.monthly_emi?.toLocaleString('en-IN')}`);
  console.log(`  - Alternatives Count: ${advRes.data.alternatives?.length}`);
  advRes.data.alternatives?.forEach((alt, i) => {
    console.log(`    Alt ${i + 1}: ${alt.name_en} (${alt.category_code}) - Score: ${alt.overall_suitability_score}`);
  });

  // Verify Issue 1: Primary business MUST be Commercial Dairy Farming
  if (!topRec.name_en.toLowerCase().includes('dairy') && topRec.category_code !== 'DAIRY_FARMING') {
    throw new Error(`Issue 1 Failed: Expected Commercial Dairy Farming as primary business, got: ${topRec.name_en} (${topRec.category_code})`);
  }
  console.log('✓ ISSUE 1 VERIFIED: Explicit intent "Commercial Dairy Farming" correctly took priority over machinery skill and other categories!');

  // Verify Issue 2: Available capital must be 300,000 and project cost must be separate
  const returnedCapital = topRec.capital || advRes.data.capital;
  if (returnedCapital !== 300000) {
    throw new Error(`Issue 2 Failed: Available capital should be 300000, got ${returnedCapital}`);
  }
  if (topRec.financials?.project_cost === returnedCapital) {
    // Project cost for Dairy is 400000, not 300000
    throw new Error(`Issue 2 Failed: Project cost equals available capital, should be separately calculated!`);
  }
  if (topRec.financials?.project_cost !== 400000) {
    throw new Error(`Expected project cost of 400000 for Commercial Dairy Farming, got ${topRec.financials?.project_cost}`);
  }
  console.log('✓ ISSUE 2 VERIFIED: Available capital remains ₹3,00,000 throughout pipeline, and Project Cost is separately calculated as ₹4,00,000!');

  // 4. Save/Activate Recommendation as Business Plan
  console.log('\n4. Saving/Activating Recommendation as Business Plan:');
  const planPayload = {
    plan_title: topRec.name_en,
    business_type: topRec.category_code,
    capital: savedProf.available_capital,
    location: {
      village: savedProf.village_name,
      district: savedProf.district,
      state: savedProf.state
    },
    status: 'ACTIVE',
    financial_details: topRec.financials,
    plan_content: {
      businessName: topRec.name_en,
      capital: savedProf.available_capital,
      requiredInvestment: topRec.financials?.project_cost,
      rawRecommendation: topRec
    }
  };

  const planSaveRes = await axios.post(`${BASE_URL}/api/business-plans`, planPayload, { headers: authHeaders });
  const savedPlan = planSaveRes.data.plan;
  console.log('✓ Plan Persisted:');
  console.log(`  - Plan ID: ${savedPlan.id}`);
  console.log(`  - Title: ${savedPlan.plan_title}`);
  console.log(`  - Capital: ₹${Number(savedPlan.capital).toLocaleString('en-IN')}`);
  console.log(`  - Location: ${JSON.stringify(savedPlan.location)}`);

  if (Number(savedPlan.capital) !== 300000) {
    throw new Error(`Saved plan capital mismatch: expected 300000, got ${savedPlan.capital}`);
  }

  // 5. Test persistence after re-login
  console.log('\n5. Testing Persistence across Session Re-Login:');
  const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
    email: syntheticEmail,
    password: 'Password@123'
  });
  const newToken = loginRes.data.token;
  const newAuthHeaders = { Authorization: `Bearer ${newToken}` };

  const reloadedProfileRes = await axios.get(`${BASE_URL}/api/profile`, { headers: newAuthHeaders });
  const reloadedProf = reloadedProfileRes.data;
  console.log('✓ Profile Reloaded after login:');
  console.log(`  - Name: ${reloadedProf.name}`);
  console.log(`  - Location: ${reloadedProf.village_name}, ${reloadedProf.district}, ${reloadedProf.state}`);
  console.log(`  - PIN: "${reloadedProf.pincode}"`);
  console.log(`  - Capital: ₹${reloadedProf.available_capital?.toLocaleString('en-IN')}`);
  console.log(`  - Business Intent: ${reloadedProf.business_interest}`);

  if (reloadedProf.name !== 'Ganesh' || reloadedProf.available_capital !== 300000 || reloadedProf.pincode === '522002') {
    throw new Error(`Profile persistence integrity failed after login!`);
  }

  const reloadedPlansRes = await axios.get(`${BASE_URL}/api/business-plans`, { headers: newAuthHeaders });
  const reloadedPlans = reloadedPlansRes.data.plans;
  console.log(`✓ Fetched Saved Plans (${reloadedPlans.length} total):`);
  reloadedPlans.forEach(p => {
    console.log(`  - [${p.id}] ${p.plan_title} | Capital: ₹${Number(p.capital).toLocaleString('en-IN')} | Loc: ${p.location?.village}, ${p.location?.district}`);
  });

  const activePlan = reloadedPlans.find(p => p.business_type === 'DAIRY_FARMING');
  if (!activePlan || Number(activePlan.capital) !== 300000) {
    throw new Error(`Dairy farming plan missing or incorrect capital after re-login!`);
  }
  console.log('✓ Re-login persistence verified!');

  console.log('\n===============================================================');
  console.log('🎉 ALL AUTOMATED ADVISORY & DATA PROPAGATION TESTS PASSED 100%');
  console.log('===============================================================');
}

runTest().then(() => process.exit(0)).catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
