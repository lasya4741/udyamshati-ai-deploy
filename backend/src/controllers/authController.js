const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const config = require('../config');
const db = require('../config/db');

/**
 * Ensure default demo accounts exist safely in the PostgreSQL database.
 * Passwords are stored exclusively as bcrypt hashes (never plaintext).
 */
async function ensureDemoUsers() {
  if (!db.isConfigured()) return;

  try {
    const kisanHash = await bcrypt.hash('kisan123', 10);
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, preferred_language)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE 
       SET updated_at = CURRENT_TIMESTAMP`,
      ['kisan@sih.gov.in', kisanHash, 'Ramesh Kisan', 'ENTREPRENEUR', 'hi']
    );

    const lakshmiHash = await bcrypt.hash('lakshmi123', 10);
    await db.query(
      `INSERT INTO users (email, password_hash, full_name, role, preferred_language)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE 
       SET updated_at = CURRENT_TIMESTAMP`,
      ['lakshmi@sih.gov.in', lakshmiHash, 'Lakshmi Devi', 'ENTREPRENEUR', 'te']
    );
  } catch (err) {
    console.warn('[Demo Users Init Notice]', err.message);
  }
}

// Initialize demo users asynchronously on module load
ensureDemoUsers();

/**
 * Register a new user with persistent PostgreSQL storage.
 * Stores passwords exclusively as bcrypt hashes.
 */
exports.register = async (req, res) => {
  try {
    const { fullName, name, email, password, preferredLanguage, role, mobile } = req.body;
    const resolvedName = (fullName || name || '').trim();
    let resolvedEmail = (email || '').trim().toLowerCase();

    // If mobile provided but email omitted, construct user identifier email
    if (!resolvedEmail && mobile) {
      const cleanDigits = mobile.replace(/\D/g, '');
      if (/^[6-9]\d{9}$/.test(cleanDigits)) {
        resolvedEmail = `${cleanDigits}@udyam.gov.in`;
      }
    }

    // Validation
    if (!resolvedName) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!resolvedEmail || !resolvedEmail.includes('@') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail)) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    // Pre-check for duplicate email in PostgreSQL
    const existingUser = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [resolvedEmail]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password using bcrypt (Never store plaintext passwords)
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userRole = (role || 'ENTREPRENEUR').toUpperCase();
    const userLanguage = (preferredLanguage || 'hi').toLowerCase();

    // Insert user into Supabase PostgreSQL
    const insertResult = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role, preferred_language)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, role, full_name, preferred_language, created_at`,
      [resolvedName, resolvedEmail, passwordHash, userRole, userLanguage]
    );

    const newUser = insertResult.rows[0];

    // Sign JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.full_name,
        preferredLanguage: newUser.preferred_language
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return sanitized user object (never expose password_hash)
    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.full_name,
        preferredLanguage: newUser.preferred_language,
        createdAt: newUser.created_at
      }
    });

  } catch (error) {
    // Catch PostgreSQL unique constraint violation (code 23505)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    console.error('[Registration Error]', error);
    return res.status(500).json({ error: 'Internal server error during registration.' });
  }
};

/**
 * Login user by validating credentials against PostgreSQL.
 */
exports.login = async (req, res) => {
  try {
    const { email, identifier, password } = req.body;
    const rawIdentifier = (email || identifier || '').trim();

    if (!rawIdentifier || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = rawIdentifier.toLowerCase();
    const cleanDigits = rawIdentifier.replace(/\D/g, '');
    const mobileFallbackEmail = cleanDigits.length === 10 ? `${cleanDigits}@udyam.gov.in` : null;

    // Query user record from PostgreSQL
    let result;
    if (mobileFallbackEmail) {
      result = await db.query(
        `SELECT id, email, password_hash, role, full_name, preferred_language, created_at
         FROM users
         WHERE LOWER(email) = LOWER($1) OR LOWER(email) = LOWER($2)`,
        [normalizedEmail, mobileFallbackEmail]
      );
    } else {
      result = await db.query(
        `SELECT id, email, password_hash, role, full_name, preferred_language, created_at
         FROM users
         WHERE LOWER(email) = LOWER($1)`,
        [normalizedEmail]
      );
    }

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Validate password using bcrypt against stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
        preferredLanguage: user.preferred_language
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return sanitized user object (never expose password_hash)
    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
        preferredLanguage: user.preferred_language,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('[Login Error]', error);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
};

/**
 * Demo Login: Authenticates as Ramesh Kisan backed by PostgreSQL.
 */
exports.demoLogin = async (req, res) => {
  try {
    await ensureDemoUsers();

    const result = await db.query(
      `SELECT id, email, role, full_name, preferred_language, created_at 
       FROM users 
       WHERE email = $1`,
      ['kisan@sih.gov.in']
    );

    if (result.rows.length === 0) {
      return res.status(500).json({ error: 'Failed to retrieve demo account from database.' });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
        preferredLanguage: user.preferred_language
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.full_name,
        preferredLanguage: user.preferred_language,
        isDemo: true,
        createdAt: user.created_at
      }
    });

  } catch (error) {
    console.error('[Demo Login Error]', error);
    return res.status(500).json({ error: 'Internal server error during demo login.' });
  }
};

/**
 * Change user password with bcrypt validation and update in PostgreSQL.
 */
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Both old password and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    const userId = req.user?.id;
    const userEmail = req.user?.email;

    if (!userId && !userEmail) {
      return res.status(401).json({ error: 'Unauthorized. Please log in to change password.' });
    }

    // Query user by UUID or Email
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let result;

    if (userId && uuidRegex.test(userId)) {
      result = await db.query(
        'SELECT id, email, password_hash FROM users WHERE id = $1',
        [userId]
      );
    } else if (userEmail) {
      result = await db.query(
        'SELECT id, email, password_hash FROM users WHERE LOWER(email) = LOWER($1)',
        [userEmail.toLowerCase()]
      );
    }

    if (!result || result.rows.length === 0) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const user = result.rows[0];

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    // Hash new password and update in PostgreSQL
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, user.id]
    );

    return res.json({ message: 'Password updated successfully' });

  } catch (error) {
    console.error('[Change Password Error]', error);
    return res.status(500).json({ error: 'Internal server error while updating password.' });
  }
};

// In-memory store for pending email access authorization codes (10 minutes validity)
const pendingEmailAccess = new Map();

/**
 * Dispatch Email Access Code for secure email login flow.
 * Validates against PostgreSQL if user already has an established account.
 */
exports.sendEmailAccessCode = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user exists in PostgreSQL
    let user = null;
    try {
      const userResult = await db.query(
        'SELECT id, email, password_hash, full_name, role, preferred_language FROM users WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );
      if (userResult.rows.length > 0) {
        user = userResult.rows[0];
      }
    } catch (e) {
      console.warn('[Check User DB Error]', e.message);
    }

    // If user exists and password provided, verify against bcrypt hash
    if (user && password) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Incorrect password for this email. Please try again.' });
      }
    }

    // Generate cryptographically secure random 6-digit access code (CSPRNG)
    const accessCode = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    const userObj = user ? {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      preferredLanguage: user.preferred_language,
      isExisting: true
    } : {
      email: normalizedEmail,
      fullName: normalizedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      role: 'ENTREPRENEUR',
      preferredLanguage: 'hi',
      isExisting: false,
      rawPassword: password || null
    };

    pendingEmailAccess.set(normalizedEmail, {
      accessCode,
      expiresAt,
      attempts: 0,
      user: userObj
    });

    const responseData = {
      success: true,
      message: `Access authorization code dispatched to ${normalizedEmail}`,
      email: normalizedEmail,
      expiresInSeconds: 600
    };

    // Conceal access code in production; only return in non-production for local simulation UI
    if (process.env.NODE_ENV !== 'production') {
      responseData.accessCode = accessCode;
    }

    return res.json(responseData);

  } catch (error) {
    console.error('[Send Email Access Code Error]', error);
    return res.status(500).json({ error: 'Internal server error while sending access code.' });
  }
};

/**
 * Verify Email Access Code and issue JWT session.
 * Automatically saves new users into PostgreSQL if not previously registered.
 * Single-use, timing-safe, rate-limited against brute force.
 */
exports.verifyEmailAccessCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: 'Email and 6-digit access code are required.' });
    }

    const cleanCode = String(code).trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      return res.status(400).json({ error: 'Access code must be exactly 6 digits.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const pending = pendingEmailAccess.get(normalizedEmail);

    if (!pending) {
      return res.status(400).json({ error: 'No pending access request found for this email. Please request a new code.' });
    }

    if (Date.now() > pending.expiresAt) {
      pendingEmailAccess.delete(normalizedEmail);
      return res.status(400).json({ error: 'Access code has expired. Please request a new code.' });
    }

    // Rate limiting: Maximum 5 verification attempts per code
    if (pending.attempts >= 5) {
      pendingEmailAccess.delete(normalizedEmail);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }

    // Timing-safe comparison to prevent timing side-channel attacks
    const expectedBuf = Buffer.from(pending.accessCode, 'utf8');
    const actualBuf = Buffer.from(cleanCode, 'utf8');
    const isCodeValid = expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);

    if (!isCodeValid) {
      pending.attempts = (pending.attempts || 0) + 1;
      const remainingAttempts = 5 - pending.attempts;
      if (remainingAttempts <= 0) {
        pendingEmailAccess.delete(normalizedEmail);
        return res.status(429).json({ error: 'Too many incorrect attempts. This access code has been invalidated.' });
      }
      return res.status(400).json({
        error: `Invalid access code. Please check your email or enter the code shown. (${remainingAttempts} attempts remaining)`
      });
    }

    // Single-use: Consume code immediately to prevent replay
    pendingEmailAccess.delete(normalizedEmail);

    let user = pending.user;

    // If new user, persist into PostgreSQL
    if (!user.isExisting) {
      const generatedPassword = user.rawPassword || (Math.random().toString(36).slice(-8) + 'A1!');
      const passwordHash = await bcrypt.hash(generatedPassword, 10);

      const insertResult = await db.query(
        `INSERT INTO users (full_name, email, password_hash, role, preferred_language)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE 
         SET updated_at = CURRENT_TIMESTAMP
         RETURNING id, email, role, full_name, preferred_language`,
        [user.fullName, normalizedEmail, passwordHash, user.role || 'ENTREPRENEUR', user.preferredLanguage || 'hi']
      );

      const dbUser = insertResult.rows[0];
      user = {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.full_name,
        role: dbUser.role,
        preferredLanguage: dbUser.preferred_language
      };
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.fullName,
        preferredLanguage: user.preferredLanguage
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    const session = {
      isAuthenticated: true,
      provider: 'email_access',
      loginTime: Date.now(),
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.fullName,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
        isDemo: false
      }
    };

    return res.json({
      success: true,
      message: 'Email access verified successfully!',
      token,
      session
    });

  } catch (error) {
    console.error('[Verify Email Access Error]', error);
    return res.status(500).json({ error: 'Internal server error while verifying access code.' });
  }
};
