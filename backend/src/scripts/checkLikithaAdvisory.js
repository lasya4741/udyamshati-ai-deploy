const axios = require('axios');

(async () => {
  try {
    const profile = {
      name: 'Likitha',
      village_name: 'Hyderabad',
      district: 'Hyderabad',
      state: 'Telangana',
      available_capital: 900000,
      land_acres: 9,
      has_machinery: false,
      business_interest: 'Smart Village Kirana & Daily Provisions Store',
      preferred_language: 'en'
    };
    const loginRes = await axios.post('http://localhost:5000/api/auth/demo-login');
    const token = loginRes.data.token;
    const res = await axios.post('http://localhost:5000/api/recommendations', profile, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('--- RECOMMENDATIONS FOR LIKITHA ---');
    console.log('Top Recommendation:');
    console.log('  Name (EN):', res.data.top_recommendation?.name_en);
    console.log('  Category Code:', res.data.top_recommendation?.category_code);
    console.log('  Score:', res.data.top_recommendation?.overall_suitability_score);
    console.log('  Capital in Plan:', res.data.top_recommendation?.capital);
    console.log('  Location:', JSON.stringify(res.data.top_recommendation?.location));
    console.log('Alternatives count:', res.data.alternatives?.length);
    res.data.alternatives?.forEach((alt, i) => {
      console.log(`  Alt ${i+1}: ${alt.name_en} (${alt.category_code}) - Score: ${alt.overall_suitability_score}`);
    });
  } catch (err) {
    console.error('Error:', err.message, err.response?.data);
  }
})();
