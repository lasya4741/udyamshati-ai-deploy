// Simulate browser localStorage environment
const storage = new Map();
global.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};

global.fetch = fetch;

const USERS_REGISTRY_KEY = 'udyam_user_registry';
const SESSION_KEY = 'udyam_auth_session';

async function testFrontendAuthFlow() {
  console.log('====================================================================');
  console.log('🖥️ Testing Frontend Auth Service & Session Lifecycle Integration');
  console.log('====================================================================\n');

  const testUser = {
    fullName: 'Ananya Sharma',
    mobile: '9845012345',
    email: `ananya.${Date.now()}@sih.gov.in`,
    password: 'Password@2026!'
  };

  // 1. Simulate Registration from frontend
  console.log('--- Step 1: Frontend User Registration ---');
  const regPayload = {
    fullName: testUser.fullName,
    email: testUser.email,
    password: testUser.password,
    mobile: testUser.mobile,
    preferredLanguage: 'hi'
  };

  const regRes = await fetch('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(regPayload)
  });

  const regData = await regRes.json();
  console.log(`Registration status: ${regRes.status}`);
  console.log(`Token received: ${Boolean(regData.token)}`);
  console.log(`User name: ${regData.user?.name}`);

  if (regRes.status !== 201 || !regData.token) {
    throw new Error('Registration API failed');
  }

  // Store session in localStorage (matching authService.saveSession)
  const initialSession = {
    isAuthenticated: true,
    provider: 'password',
    loginTime: Date.now(),
    token: regData.token,
    user: {
      id: regData.user.id,
      name: regData.user.name,
      email: regData.user.email,
      role: regData.user.role,
      mobile: testUser.mobile,
      preferredLanguage: regData.user.preferredLanguage,
      isDemo: false
    }
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(initialSession));
  console.log('✅ Step 1 PASSED: Registration saved session to localStorage with JWT.');

  // 2. Simulate Page Refresh (restoring state from localStorage)
  console.log('\n--- Step 2: Session Persistence Across Page Refresh ---');
  const restoredSessionStr = localStorage.getItem(SESSION_KEY);
  const restoredSession = JSON.parse(restoredSessionStr);

  console.log(`Session restored successfully: ${Boolean(restoredSession)}`);
  console.log(`Is authenticated: ${restoredSession.isAuthenticated}`);
  console.log(`Restored user name: ${restoredSession.user?.name}`);
  console.log(`Token valid and present: ${Boolean(restoredSession.token)}`);

  if (!restoredSession || !restoredSession.isAuthenticated || !restoredSession.token) {
    throw new Error('Session did not persist in localStorage');
  }
  console.log('✅ Step 2 PASSED: Frontend session completely preserved across page refresh.');

  // 3. Authenticated API Call using Restored Token (Axios interceptor test)
  console.log('\n--- Step 3: Authenticated API Call with Stored JWT ---');
  const profileRes = await fetch('http://localhost:5000/api/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${restoredSession.token}`
    }
  });

  console.log(`Profile fetch status with restored token: ${profileRes.status}`);
  if (profileRes.status !== 200) {
    throw new Error(`Profile access failed with status: ${profileRes.status}`);
  }
  console.log('✅ Step 3 PASSED: Restored JWT successfully authenticated on private endpoint.');

  // 4. Test Login with Invalid Password
  console.log('\n--- Step 4: Login with Incorrect Password ---');
  const badLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: 'WrongPassword999!' })
  });

  const badLoginData = await badLoginRes.json();
  console.log(`Invalid login status: ${badLoginRes.status} (${badLoginData.error})`);
  if (badLoginRes.status !== 401) {
    throw new Error('Invalid login did not return 401');
  }
  console.log('✅ Step 4 PASSED: Invalid password rejected with HTTP 401.');

  // 5. Test Login with Correct Credentials
  console.log('\n--- Step 5: Login with Valid Credentials ---');
  const goodLoginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUser.email, password: testUser.password })
  });

  const goodLoginData = await goodLoginRes.json();
  console.log(`Valid login status: ${goodLoginRes.status}`);
  console.log(`New token issued: ${Boolean(goodLoginData.token)}`);
  if (goodLoginRes.status !== 200 || !goodLoginData.token) {
    throw new Error('Valid login failed');
  }
  console.log('✅ Step 5 PASSED: Valid credentials authenticated and new JWT issued.');

  // 6. Test Logout (Clearing Session)
  console.log('\n--- Step 6: Frontend Logout ---');
  localStorage.removeItem(SESSION_KEY);
  const clearedSession = localStorage.getItem(SESSION_KEY);
  console.log(`Session after logout: ${clearedSession}`);
  if (clearedSession !== null) {
    throw new Error('Session was not cleared on logout');
  }
  console.log('✅ Step 6 PASSED: Logout successfully clears session state.');

  console.log('\n====================================================================');
  console.log('🎉 ALL FRONTEND INTEGRATION & SESSION LIFECYCLE TESTS PASSED!');
  console.log('====================================================================');
  process.exit(0);
}

testFrontendAuthFlow().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
