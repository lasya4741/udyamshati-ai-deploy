const axios = require('axios');

async function testDemoAccount() {
  console.log('=== TESTING DEMO ACCOUNT (kisan@sih.gov.in) WITH GANESH PROFILE ===');

  const BASE_URL = 'http://localhost:5000';

  // 1. Login with demo account
  const loginRes = await axios.post(`${BASE_URL}/api/auth/demo-login`);
  const token = loginRes.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };
  console.log('✓ Demo Login Success. User:', loginRes.data.user.email);

  // 2. Update profile with Ganesh profile details
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
    pincode: ''
  };

  const profileRes = await axios.post(`${BASE_URL}/api/profile`, ganeshProfile, { headers: authHeaders });
  const prof = profileRes.data.profile || profileRes.data;
  console.log('✓ Profile updated for demo user:');
  console.log(`  - Name: ${prof.name}`);
  console.log(`  - Location: ${prof.village_name}, ${prof.district}, ${prof.state}`);
  console.log(`  - PIN: "${prof.pincode}"`);
  console.log(`  - Capital: ₹${prof.available_capital?.toLocaleString('en-IN')}`);
  console.log(`  - Intent: ${prof.business_interest}`);

  // 3. Generate Advisory
  const advRes = await axios.post(`${BASE_URL}/api/recommendations`, prof, { headers: authHeaders });
  const topRec = advRes.data.top_recommendation;
  console.log('✓ Advisory Generated for Demo User:');
  console.log(`  - Recommended Business: ${topRec.name_en}`);
  console.log(`  - Category: ${topRec.category_code}`);
  console.log(`  - Suitability: ${topRec.overall_suitability_score}/100`);
  console.log(`  - Capital: ₹${(topRec.capital || advRes.data.capital)?.toLocaleString('en-IN')}`);
  console.log(`  - Project Cost: ₹${topRec.financials?.project_cost?.toLocaleString('en-IN')}`);
  console.log(`  - Monthly EMI: ₹${topRec.financials?.monthly_emi?.toLocaleString('en-IN')}`);
  console.log(`  - Top Alternative: ${advRes.data.alternatives?.[0]?.name_en} (${advRes.data.alternatives?.[0]?.overall_suitability_score})`);

  if (topRec.category_code !== 'DAIRY_FARMING') {
    throw new Error(`Expected DAIRY_FARMING, got: ${topRec.category_code}`);
  }
  if ((topRec.capital || advRes.data.capital) !== 300000) {
    throw new Error(`Available capital should be 300000, got: ${topRec.capital}`);
  }
  if (topRec.financials?.project_cost !== 400000) {
    throw new Error(`Project cost should be 400000, got: ${topRec.financials?.project_cost}`);
  }
  if (prof.pincode === '522002') {
    throw new Error(`Stale PIN 522002 detected for Gujarat!`);
  }

  // 4. Save/Activate Recommendation as Plan
  const planPayload = {
    plan_title: topRec.name_en,
    business_type: topRec.category_code,
    capital: prof.available_capital,
    location: { village: prof.village_name, district: prof.district, state: prof.state },
    status: 'ACTIVE',
    financial_details: topRec.financials,
    plan_content: {
      businessName: topRec.name_en,
      capital: prof.available_capital,
      requiredInvestment: topRec.financials?.project_cost,
      rawRecommendation: topRec
    }
  };
  const savePlanRes = await axios.post(`${BASE_URL}/api/business-plans`, planPayload, { headers: authHeaders });
  console.log('✓ Dairy Farming plan saved/activated:', savePlanRes.data.plan.plan_title);

  // 5. Query all saved business plans
  const plansRes = await axios.get(`${BASE_URL}/api/business-plans`, { headers: authHeaders });
  console.log(`✓ Total Saved Plans for Demo Account: ${plansRes.data.plans.length}`);
  plansRes.data.plans.forEach(p => {
    console.log(`  - [${p.id}] ${p.plan_title} (${p.business_type}) | Capital: ₹${Number(p.capital).toLocaleString('en-IN')} | Loc: ${p.location?.village || ''}, ${p.location?.district || ''}`);
  });

  console.log('=== DEMO ACCOUNT VERIFICATION COMPLETE: ALL CHECKS PASSED ===');
}

testDemoAccount().then(() => process.exit(0)).catch(e => {
  console.error('Demo account test error:', e.message);
  process.exit(1);
});
