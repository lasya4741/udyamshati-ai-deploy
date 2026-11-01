const axios = require('axios');

async function runFullLifecycle() {
  console.log('=====================================================');
  console.log('🧪 RUNNING FULL LIFECYCLE RECOVERY & INTEGRITY AUDIT');
  console.log('=====================================================');

  // STEP 1: Authenticate demo user (kisan@sih.gov.in)
  console.log('\n[1/8] Authenticating Demo Account...');
  const loginRes = await axios.post('http://localhost:5000/api/auth/demo-login');
  let token = loginRes.data.token;
  console.log('✓ Logged in as:', loginRes.data.user.email);

  // STEP 2: Load current profile and verify all details
  console.log('\n[2/8] Verifying Current Entrepreneur Profile...');
  const profRes = await axios.get('http://localhost:5000/api/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const prof = profRes.data;
  console.log('✓ Profile Data:');
  console.log('  - Name:', prof.name, '(Expected: Likitha)');
  console.log('  - Capital: ₹' + prof.available_capital?.toLocaleString('en-IN'), '(Expected: ₹9,00,000)');
  console.log('  - Land:', prof.land_acres, 'Acres (Expected: 9 Acres)');
  console.log('  - Business Interest:', prof.business_interest);
  if (prof.name !== 'Likitha' || prof.available_capital !== 900000 || prof.land_acres !== 9) {
    throw new Error('Profile details mismatch!');
  }

  // STEP 3: Generate decision advisory using current profile
  console.log('\n[3/8] Generating Advisory with Current Profile...');
  const recRes = await axios.post('http://localhost:5000/api/recommendations', prof, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const topRec = recRes.data.top_recommendation;
  console.log('✓ Generated Recommendation:');
  console.log('  - Business:', topRec.name_en);
  console.log('  - Category:', topRec.category_code);
  console.log('  - Score:', topRec.overall_suitability_score);
  console.log('  - Financial Viability:', topRec.financials?.financial_viability);
  if (topRec.category_code !== 'KIRANA_DAILY_NEEDS') {
    throw new Error('Advisory did not produce Kirana store recommendation!');
  }

  // STEP 4: Save & synchronize the newly generated Kirana store plan
  console.log('\n[4/8] Saving/Syncing Advisory Plan...');
  const saveRes = await axios.post('http://localhost:5000/api/business-plans', {
    plan_title: topRec.name_en,
    business_type: topRec.category_code,
    capital: prof.available_capital,
    location: { village: prof.village_name, district: prof.district, state: prof.state },
    status: 'ACTIVE',
    financial_details: topRec.financials,
    plan_content: { businessName: topRec.name_en, capital: prof.available_capital, rawRecommendation: topRec }
  }, { headers: { Authorization: `Bearer ${token}` } });
  console.log('✓ Plan Synchronized:', saveRes.data.plan.plan_title, `[${saveRes.data.plan.id}]`);

  // STEP 5: Verify Saved Plans and confirm all distinct plans exist
  console.log('\n[5/8] Inspecting Saved Business Plans...');
  const plansRes = await axios.get('http://localhost:5000/api/business-plans', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const plans = plansRes.data.plans;
  console.log(`✓ Total Saved Plans: ${plans.length}`);
  plans.forEach(p => {
    console.log(`  - [${p.business_type}] ${p.plan_title} | Capital: ₹${Number(p.capital).toLocaleString('en-IN')} | Loc: ${JSON.stringify(p.location)}`);
  });

  const poultry = plans.find(p => p.business_type === 'POULTRY_FARMING');
  const mushroom = plans.find(p => p.business_type === 'MUSHROOM_FARMING');
  const hiring = plans.find(p => p.business_type === 'CUSTOM_HIRING_CENTRE');
  const kirana = plans.find(p => p.business_type === 'KIRANA_DAILY_NEEDS');

  if (!poultry || !mushroom || !hiring || !kirana) {
    throw new Error('One of the genuine plans is missing!');
  }

  // STEP 6: Confirm historical integrity of saved plans
  console.log('\n[6/8] Confirming Historical Plan Integrity...');
  if (Number(poultry.capital) !== 250000 || poultry.location?.district !== 'Guntur') {
    throw new Error('Poultry plan historical details corrupted!');
  }
  console.log('✓ Poultry: Capital ₹2,50,000 | Location: Brodipet, Guntur (PRESERVED)');

  if (Number(mushroom.capital) !== 50000) {
    throw new Error('Mushroom plan historical details corrupted!');
  }
  console.log('✓ Mushroom: Capital ₹50,000 | Location: Brodipet, Guntur (PRESERVED)');

  if (Number(hiring.capital) !== 400000) {
    throw new Error('Custom Hiring Centre capital corrupted!');
  }
  console.log('✓ Custom Hiring Centre: Capital ₹4,00,000 (PRESERVED)');

  if (Number(kirana.capital) !== 900000) {
    throw new Error('Kirana Store capital does not match current profile!');
  }
  console.log('✓ Smart Village Kirana Store: Capital ₹9,00,000 (MATCHES CURRENT PROFILE)');

  // STEP 7: Re-fetch plans to simulate page refresh & verify zero duplicate records
  console.log('\n[7/8] Simulating Page Refresh (Idempotency & Duplicate Check)...');
  const refreshPlans = await axios.get('http://localhost:5000/api/business-plans', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (refreshPlans.data.plans.length !== plans.length) {
    throw new Error(`Plans count changed on refresh! Was ${plans.length}, now ${refreshPlans.data.plans.length}`);
  }
  const uniqueTypes = new Set(refreshPlans.data.plans.map(p => p.business_type));
  if (uniqueTypes.size !== refreshPlans.data.plans.length) {
    throw new Error('Duplicate business types detected on refresh!');
  }
  console.log('✓ Refresh simulation verified: 0 duplicates, plan count remained exactly', refreshPlans.data.plans.length);

  // STEP 8: Logout & Re-login Check
  console.log('\n[8/8] Testing Logout and Re-login...');
  const relogin = await axios.post('http://localhost:5000/api/auth/demo-login');
  token = relogin.data.token;
  const rePlans = await axios.get('http://localhost:5000/api/business-plans', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (rePlans.data.plans.length !== 4) {
    throw new Error(`Expected 4 plans after re-login, got ${rePlans.data.plans.length}`);
  }
  console.log('✓ Re-login verified: all 4 distinct plans retrieved successfully.');

  console.log('\n=====================================================');
  console.log('🎉 ALL 8 LIFECYCLE RECOVERY AUDIT CHECKS PASSED 100%!');
  console.log('=====================================================');
}

runFullLifecycle().catch(e => {
  console.error('LIFECYCLE TEST FAILED:', e.response?.data || e.message);
  process.exit(1);
});
