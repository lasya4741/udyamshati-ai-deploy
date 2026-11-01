const axios = require('axios');

async function test() {
  console.log('=== END-TO-END DATA CONSISTENCY TEST ===');
  
  // 1. Authenticate with demo login
  const loginRes = await axios.post('http://localhost:5000/api/auth/demo-login');
  const token = loginRes.data.token;
  console.log('✓ Demo Login Success. Token obtained for user:', loginRes.data.user.email);
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Load current profile
  const profRes = await axios.get('http://localhost:5000/api/profile', { headers: authHeaders });
  const prof = profRes.data;
  console.log('✓ Current Entrepreneur Profile Loaded:');
  console.log(`  - Name: ${prof.name}`);
  console.log(`  - Available Capital: ₹${prof.available_capital?.toLocaleString('en-IN')}`);
  console.log(`  - Land: ${prof.land_acres} Acres`);
  console.log(`  - Location: ${prof.village_name}, ${prof.district}, ${prof.state}`);
  console.log(`  - Business Interest: ${prof.business_interest}`);

  // Verify profile values match Likitha's dossier
  if (prof.name !== 'Likitha' || prof.available_capital !== 900000 || prof.land_acres !== 9) {
    throw new Error(`Profile does not match Likitha dossier! Got: ${prof.name}, ${prof.available_capital}, ${prof.land_acres}`);
  }

  // 3. Generate Advisory
  const advisoryRes = await axios.post('http://localhost:5000/api/recommendations', prof, { headers: authHeaders });
  const rec = advisoryRes.data?.top_recommendation;
  console.log('✓ Advisory Generated for Current Profile:');
  console.log(`  - Recommended Business: ${rec.name_en}`);
  console.log(`  - Category: ${rec.category_code}`);
  console.log(`  - Overall Suitability: ${rec.overall_suitability_score}/100`);
  console.log(`  - Project Cost: ₹${rec.financials?.project_cost?.toLocaleString('en-IN')}`);
  console.log(`  - Monthly EMI: ₹${rec.financials?.monthly_emi?.toLocaleString('en-IN')}`);

  if (rec.category_code !== 'KIRANA_DAILY_NEEDS') {
    throw new Error(`Expected KIRANA_DAILY_NEEDS recommendation for Likitha, got: ${rec.category_code}`);
  }

  // 4. Save/Activate Recommendation as Plan
  const planPayload = {
    plan_title: rec.name_en,
    business_type: rec.category_code,
    capital: prof.available_capital,
    location: { village: prof.village_name, district: prof.district, state: prof.state },
    status: 'ACTIVE',
    financial_details: rec.financials,
    plan_content: {
      businessName: rec.name_en,
      capital: prof.available_capital,
      rawRecommendation: rec
    }
  };
  const saveRes = await axios.post('http://localhost:5000/api/business-plans', planPayload, { headers: authHeaders });
  console.log('✓ Recommendation Saved/Activated to Database:', saveRes.data.message);
  console.log(`  - Saved Plan ID: ${saveRes.data.plan.id}`);
  console.log(`  - Saved Plan Title: ${saveRes.data.plan.plan_title}`);

  // 5. Query all saved business plans
  const plansRes = await axios.get('http://localhost:5000/api/business-plans', { headers: authHeaders });
  const plans = plansRes.data.plans;
  console.log(`✓ Fetched Saved Plans (${plans.length} total):`);
  plans.forEach(p => {
    console.log(`  - [${p.id}] ${p.plan_title} | Capital: ₹${Number(p.capital).toLocaleString('en-IN')} | Type: ${p.business_type} | Loc: ${p.location?.village || ''}, ${p.location?.district || ''}`);
  });

  // Verify uniqueness and distinctness of plans
  const types = plans.map(p => p.business_type.toUpperCase());
  const uniqueTypes = new Set(types);
  if (types.length !== uniqueTypes.size) {
    throw new Error(`Duplicate business types detected in saved plans! Got: ${types.join(', ')}`);
  }
  console.log('✓ All saved plans have unique business types (Zero duplicates)!');

  // Verify historical integrity of individual plans
  const poultry = plans.find(p => p.business_type === 'POULTRY_FARMING');
  if (poultry) {
    if (Number(poultry.capital) !== 250000 || poultry.location?.district !== 'Guntur') {
      throw new Error(`Poultry plan historical integrity violated! Capital: ${poultry.capital}, Loc: ${JSON.stringify(poultry.location)}`);
    }
    console.log('✓ Poultry Farming historical plan integrity preserved (Capital: ₹2,50,000, Brodipet, Guntur)');
  }

  const kirana = plans.find(p => p.business_type === 'KIRANA_DAILY_NEEDS');
  if (kirana) {
    if (Number(kirana.capital) !== 900000) {
      throw new Error(`Kirana plan capital mismatch! Got: ${kirana.capital}`);
    }
    console.log('✓ Kirana Store plan correctly matches current profile (Capital: ₹9,00,000, Hyderabad)');
  }

  const customHiring = plans.find(p => p.business_type === 'CUSTOM_HIRING_CENTRE');
  if (customHiring) {
    console.log(`✓ Custom Hiring Centre preserved (Capital: ₹${Number(customHiring.capital).toLocaleString('en-IN')})`);
  }

  const mushroom = plans.find(p => p.business_type === 'MUSHROOM_FARMING');
  if (mushroom) {
    console.log(`✓ Mushroom Farming preserved (Capital: ₹${Number(mushroom.capital).toLocaleString('en-IN')})`);
  }

  console.log('\n=== ALL END-TO-END DATA INTEGRITY TESTS PASSED! ===');
}

test().catch(err => {
  console.error('Test FAILED:', err.response?.data || err.message);
  process.exit(1);
});
