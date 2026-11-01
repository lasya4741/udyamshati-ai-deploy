const jwt = require('jsonwebtoken');
const config = require('../config');

const BASE_URL = 'http://localhost:5000/api';

async function runSecurityAudit() {
  console.log('====================================================================');
  console.log('🔒 Running Focused Authentication Security Verification Suite');
  console.log('====================================================================\n');

  let passedAll = true;

  // 1. Direct call bypass attempt to verify-email-access without code dispatch
  console.log('--- Check 1: Bypass prevention on verify-email-access endpoint ---');
  try {
    const unprovokedRes = await fetch(`${BASE_URL}/auth/verify-email-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'attacker@evil.com', code: '123456' })
    });
    const data = await unprovokedRes.json();
    console.log(`Unprovoked verify status: ${unprovokedRes.status} (${data.error})`);
    if (unprovokedRes.status !== 400 || !data.error) {
      throw new Error(`Direct call bypass failed: expected 400, got ${unprovokedRes.status}`);
    }
    console.log('✅ Check 1 PASSED: Unprovoked direct verification rejected.');
  } catch (e) {
    console.error('❌ Check 1 FAILED:', e.message);
    passedAll = false;
  }

  // 2. Brute-force rate limiting and attempt invalidation
  console.log('\n--- Check 2: Rate limiting & Brute Force Invalidation on access codes ---');
  try {
    const testEmail = `sec.test.${Date.now()}@sih.gov.in`;
    const sendRes = await fetch(`${BASE_URL}/auth/send-email-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'Pass@123456' })
    });
    const sendData = await sendRes.json();
    const realCode = sendData.accessCode;

    // Send 5 incorrect attempts
    let lastStatus = 0;
    let lastData = {};
    for (let i = 1; i <= 5; i++) {
      const badRes = await fetch(`${BASE_URL}/auth/verify-email-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, code: '000000' })
      });
      lastStatus = badRes.status;
      lastData = await badRes.json();
      console.log(`Attempt ${i} status: ${lastStatus} (${lastData.error})`);
    }

    if (lastStatus !== 429) {
      throw new Error(`Expected 429 after 5 failed attempts, got ${lastStatus}`);
    }

    // Attempt with real code after lockout -> should fail because code was invalidated
    const lockedRes = await fetch(`${BASE_URL}/auth/verify-email-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, code: realCode })
    });
    console.log(`After lockout real code status: ${lockedRes.status}`);
    if (lockedRes.status !== 400 && lockedRes.status !== 429) {
      throw new Error(`Invalidated code was accepted: status ${lockedRes.status}`);
    }
    console.log('✅ Check 2 PASSED: Code invalidated after 5 failed attempts.');
  } catch (e) {
    console.error('❌ Check 2 FAILED:', e.message);
    passedAll = false;
  }

  // 3. Single-use guarantee (replay prevention)
  console.log('\n--- Check 3: Single-Use Code Guarantee (Replay Attack Prevention) ---');
  try {
    const replayEmail = `replay.${Date.now()}@sih.gov.in`;
    const sendRes = await fetch(`${BASE_URL}/auth/send-email-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: replayEmail, password: 'Pass@123456' })
    });
    const sendData = await sendRes.json();
    const code = sendData.accessCode;

    // Use code first time -> Success
    const firstUse = await fetch(`${BASE_URL}/auth/verify-email-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: replayEmail, code })
    });
    console.log(`First use status: ${firstUse.status}`);
    if (firstUse.status !== 200) {
      throw new Error(`First use failed: ${firstUse.status}`);
    }

    // Replay same code second time -> Must fail
    const replayUse = await fetch(`${BASE_URL}/auth/verify-email-access`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: replayEmail, code })
    });
    const replayData = await replayUse.json();
    console.log(`Replay use status: ${replayUse.status} (${replayData.error})`);
    if (replayUse.status !== 400) {
      throw new Error(`Replayed code was accepted: status ${replayUse.status}`);
    }
    console.log('✅ Check 3 PASSED: Code consumed immediately; replay blocked.');
  } catch (e) {
    console.error('❌ Check 3 FAILED:', e.message);
    passedAll = false;
  }

  // 4. JWT Authentication Middleware Validation
  console.log('\n--- Check 4: JWT Middleware Strict Token Validation ---');
  try {
    // 4a. No token on protected private endpoint (/api/profile)
    const noTokenRes = await fetch(`${BASE_URL}/profile`, { method: 'GET' });
    console.log(`No token request to /api/profile status: ${noTokenRes.status}`);
    if (noTokenRes.status !== 401) {
      throw new Error(`Protected endpoint accessible without token! Status: ${noTokenRes.status}`);
    }

    // 4b. Forged/Garbage token
    const forgedTokenRes = await fetch(`${BASE_URL}/profile`, {
      method: 'GET',
      headers: { 'Authorization': 'Bearer evil_forged_fake_token_12345' }
    });
    console.log(`Forged token request status: ${forgedTokenRes.status}`);
    if (forgedTokenRes.status !== 401) {
      throw new Error(`Protected endpoint accessible with forged token! Status: ${forgedTokenRes.status}`);
    }

    // 4c. Valid JWT signed with server secret
    const validToken = jwt.sign(
      { id: 'user-valid-test', email: 'valid@sih.gov.in', role: 'ENTREPRENEUR' },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const validRes = await fetch(`${BASE_URL}/profile`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${validToken}` }
    });
    console.log(`Valid JWT request status: ${validRes.status}`);
    if (validRes.status !== 200) {
      throw new Error(`Valid JWT rejected! Status: ${validRes.status}`);
    }

    // 4d. Password change endpoint without token
    const noTokenPassRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPassword: 'old', newPassword: 'new' })
    });
    console.log(`Change password without token status: ${noTokenPassRes.status}`);
    if (noTokenPassRes.status !== 401) {
      throw new Error(`Change password accessible without token! Status: ${noTokenPassRes.status}`);
    }

    console.log('✅ Check 4 PASSED: JWT middleware strictly enforces token validity on private endpoints.');
  } catch (e) {
    console.error('❌ Check 4 FAILED:', e.message);
    passedAll = false;
  }

  // 5. Check Demo Accounts Password Secrecy
  console.log('\n--- Check 5: Demo Account & Password Concealment ---');
  try {
    const demoRes = await fetch(`${BASE_URL}/auth/demo-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const demoData = await demoRes.json();

    const exposedInDemo = 'password_hash' in demoData.user || 'passwordHash' in demoData.user || 'password' in demoData.user;
    console.log(`Demo response has password/hash: ${exposedInDemo}`);
    if (exposedInDemo) {
      throw new Error('Demo response exposed password or hash!');
    }

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'kisan@sih.gov.in', password: 'kisan123' })
    });
    const loginData = await loginRes.json();
    const exposedInLogin = 'password_hash' in loginData.user || 'password' in loginData.user;
    console.log(`Login response has password/hash: ${exposedInLogin}`);
    if (exposedInLogin) {
      throw new Error('Login response exposed password or hash!');
    }

    console.log('✅ Check 5 PASSED: Demo and login endpoints strictly conceal passwords and hashes.');
  } catch (e) {
    console.error('❌ Check 5 FAILED:', e.message);
    passedAll = false;
  }

  console.log('\n====================================================================');
  if (passedAll) {
    console.log('🎉 ALL SECURITY CHECKS PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME SECURITY CHECKS FAILED.');
  }
  console.log('====================================================================');
  process.exit(passedAll ? 0 : 1);
}

runSecurityAudit().catch(err => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
