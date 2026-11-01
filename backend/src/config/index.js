const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Priority: backend/.env > root .env > process environment
const backendEnvPath = path.resolve(__dirname, '../../.env');
const rootEnvPath = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

// 1. Port Validation
const rawPort = process.env.PORT;
let port = 5000;
if (rawPort) {
  const parsedPort = parseInt(rawPort, 10);
  if (!isNaN(parsedPort) && parsedPort >= 1 && parsedPort <= 65535) {
    port = parsedPort;
  } else {
    console.warn(`[Backend Config Warning] Invalid PORT "${rawPort}". Defaulting to 5000.`);
  }
}

// 2. JWT Secret Validation
const DEFAULT_DEV_JWT_SECRET = 'sih26091_rural_advisor_secure_jwt_secret_2026';
const jwtSecret = (process.env.JWT_SECRET || '').trim();
if (!jwtSecret) {
  console.warn('[Backend Config Notice] JWT_SECRET is not set in backend/.env. Using built-in development secret.');
}

// 3. AI Microservice Target URL Validation
let aiServiceUrl = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:8001').trim();
if (!aiServiceUrl.startsWith('http://') && !aiServiceUrl.startsWith('https://')) {
  console.warn(`[Backend Config Warning] AI_SERVICE_URL "${aiServiceUrl}" must start with http:// or https://. Defaulting to http://127.0.0.1:8001.`);
  aiServiceUrl = 'http://127.0.0.1:8001';
}

// 4. Google Maps Server Key
const rawMapsKey = process.env.GOOGLE_MAPS_SERVER_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
const googleMapsServerKey = rawMapsKey.trim().replace(/^['"]|['"]$/g, '');
if (!googleMapsServerKey) {
  console.log('[Backend Config Notice] GOOGLE_MAPS_SERVER_KEY is not set. Real-time Google Places queries disabled; PostGIS local places catalog & Leaflet fallback will be used.');
}

// 5. Supabase PostgreSQL Database URL
const rawDatabaseUrl = (process.env.DATABASE_URL || '').trim();
if (!rawDatabaseUrl) {
  console.log('[Backend Config Notice] DATABASE_URL is not configured yet in backend/.env. Database features will operate in standby mode until configured.');
} else {
  console.log('[Backend Config] DATABASE_URL is configured.');
}

module.exports = {
  PORT: port,
  JWT_SECRET: jwtSecret || DEFAULT_DEV_JWT_SECRET,
  AI_SERVICE_URL: aiServiceUrl,
  DATABASE_URL: rawDatabaseUrl,
  GOOGLE_MAPS_SERVER_KEY: googleMapsServerKey,
  DATA_DIR: path.resolve(__dirname, '../../../data')
};


