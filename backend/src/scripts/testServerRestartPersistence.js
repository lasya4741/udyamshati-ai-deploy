const axios = require('axios');
const { execSync } = require('child_process');

const BASE_URL = 'http://127.0.0.1:5000/api';

async function testServerRestartPersistence() {
  console.log('========================================================');
  console.log('🔄 TESTING DATABASE PERSISTENCE ACROSS SERVER RESTARTS');
  console.log('========================================================\n');

  const timestamp = Date.now();
  const testEmail = `restart.test.${timestamp}@sih.gov.in`;
  const password = `RestartTestP@ss${timestamp}!`;

  // Step 1: Register user
  console.log('1. Registering user...');
  const regRes = await axios.post(`${BASE_URL}/auth/register`, {
    name: 'Kisan Kumar',
    email: testEmail,
    phone: '9988776655',
    password: password
  });
  const token = regRes.data.token;
  const userId = regRes.data.user.id;
  console.log(`   User registered: ${userId}`);

  // Step 2: Save profile
  console.log('\n2. Saving entrepreneur profile to PostgreSQL...');
  const profileData = {
    name: 'Kisan Kumar',
    phone: '9988776655',
    available_capital: 420000.0,
    land_acres: 3.5,
    village_name: 'Pimpalgaon Baswant',
    mandal_or_block: 'Niphad',
    district: 'Nashik',
    state: 'Maharashtra',
    pincode: '422209',
    social_category: 'GENERAL',
    gender: 'MALE',
    skills: ['agro_processing', 'cold_storage'],
    business_interest: 'Grape export & raisin manufacturing'
  };

  const saveRes = await axios.post(`${BASE_URL}/profile`, profileData, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`   Profile saved with ID: ${saveRes.data.profile.id}, Capital: ${saveRes.data.profile.available_capital}`);

  // Step 3: Simulate server restart
  console.log('\n3. Simulating server restart (Killing Node.js server and relaunching)...');
  // Kill process on port 5000
  try {
    execSync('powershell -Command "Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"', { stdio: 'ignore' });
  } catch (e) {}

  // Wait 1.5 seconds
  await new Promise(r => setTimeout(r, 1500));

  // Spawn new backend process
  const { spawn } = require('child_process');
  const child = spawn('node', ['server.js'], {
    cwd: 'd:\\COLLEGE\\SIH\\UdyamShati-ai\\backend',
    detached: true,
    stdio: 'ignore'
  });
  child.unref();

  // Wait for server to come up
  let attempts = 0;
  let serverReady = false;
  while (attempts < 20 && !serverReady) {
    await new Promise(r => setTimeout(r, 1000));
    try {
      const ping = await axios.get(`${BASE_URL}/health/db`);
      if (ping.status === 200) serverReady = true;
    } catch (e) {
      attempts++;
    }
  }

  if (!serverReady) {
    throw new Error('Server failed to start after restart simulation.');
  }
  console.log('   Server successfully restarted and healthy!');

  // Step 4: Retrieve profile after server restart
  console.log('\n4. Fetching profile with JWT token after server restart...');
  const retrieveRes = await axios.get(`${BASE_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const retrieved = retrieveRes.data;
  console.log('   Retrieved Profile:');
  console.log(`     - Name: ${retrieved.name}`);
  console.log(`     - Capital: ${retrieved.available_capital}`);
  console.log(`     - Village: ${retrieved.village_name}, ${retrieved.district}, ${retrieved.state}`);
  console.log(`     - Skills: ${retrieved.skills.join(', ')}`);
  console.log(`     - Has Profile: ${retrieved.hasProfile}`);

  if (
    retrieved.hasProfile === true &&
    retrieved.name === 'Kisan Kumar' &&
    retrieved.available_capital === 420000.0 &&
    retrieved.village_name === 'Pimpalgaon Baswant' &&
    retrieved.skills.includes('cold_storage')
  ) {
    console.log('\n🎉 SUCCESS: All profile data remained 100% persistent across server restart!');
    process.exit(0);
  } else {
    console.error('\n❌ FAILURE: Retrieved data did not match persisted values!');
    process.exit(1);
  }
}

testServerRestartPersistence().catch(err => {
  console.error('Error during restart test:', err.message);
  process.exit(1);
});
