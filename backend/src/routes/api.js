const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const profileController = require('../controllers/profileController');
const businessPlanController = require('../controllers/businessPlanController');
const aiOrchestrator = require('../controllers/aiOrchestrator');
const mapsController = require('../controllers/mapsController');
const { verifyToken } = require('../middleware/auth');
const db = require('../config/db');

// Database Health Check Endpoint (GET /api/health/db)
router.get('/health/db', async (req, res) => {
  if (!db.isConfigured()) {
    return res.status(503).json({
      status: 'unconfigured',
      database: 'postgresql',
      connected: false,
      message: 'DATABASE_URL is not configured yet in backend/.env. Enter your Supabase connection string to connect.'
    });
  }

  const result = await db.testConnection();

  if (result.success) {
    return res.status(200).json({
      status: 'healthy',
      database: 'postgresql',
      connected: true,
      timestamp: result.timestamp,
      current_database: result.database,
      latency_ms: result.latencyMs,
      server_version: result.version
    });
  }

  return res.status(503).json({
    status: 'unhealthy',
    database: 'postgresql',
    connected: false,
    error: result.error,
    message: 'Failed to connect to PostgreSQL database via DATABASE_URL.'
  });
});


// Auth routes
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/demo-login', authController.demoLogin);
router.post('/auth/change-password', verifyToken, authController.changePassword);
router.post('/auth/send-email-access', authController.sendEmailAccessCode);
router.post('/auth/verify-email-access', authController.verifyEmailAccessCode);

// Profile routes
router.get('/profile', verifyToken, profileController.getProfile);
router.post('/profile', verifyToken, profileController.updateProfile);
router.put('/profile', verifyToken, profileController.updateProfile);

// Business Plan routes (Phase 2 - Persistent Plans in Supabase)
router.post('/business-plans', verifyToken, businessPlanController.createPlan);
router.get('/business-plans', verifyToken, businessPlanController.getPlans);
router.get('/business-plans/:id', verifyToken, businessPlanController.getPlanById);
router.put('/business-plans/:id', verifyToken, businessPlanController.updatePlan);
router.delete('/business-plans/:id', verifyToken, businessPlanController.deletePlan);

// AI Orchestrator routes
router.post('/chat', verifyToken, aiOrchestrator.handleChat);
router.post('/recommendations', verifyToken, aiOrchestrator.getRecommendations);
router.post('/market-analysis', verifyToken, aiOrchestrator.analyzeMarket);
router.get('/competitors', verifyToken, aiOrchestrator.getCompetitors);
router.post('/financial-analysis', verifyToken, aiOrchestrator.structureFinances);
router.post('/scheme-matching', verifyToken, aiOrchestrator.evaluateSchemes);
router.post('/simulation', verifyToken, aiOrchestrator.simulateWhatIf);
router.post('/rag/search', verifyToken, aiOrchestrator.searchRAG);

// Meta data routes
router.get('/catalog', aiOrchestrator.getCatalog);
router.get('/locations', aiOrchestrator.getLocations);
router.post('/nlp/parse', aiOrchestrator.parseNLP);

// Google Maps & Hyper-Local Intelligence routes
router.post('/maps/nearby', mapsController.getNearbyPlaces);
router.get('/maps/places', mapsController.getPlaces);
router.get('/maps/search', mapsController.searchPlaces);
router.post('/maps/search', mapsController.searchPlaces);
router.get('/maps/place/:placeId', mapsController.getPlaceDetails);
router.post('/maps/street-view', mapsController.checkStreetView);
router.post('/maps/directions', mapsController.getDirections);
router.post('/maps/market-analysis', mapsController.getMarketAnalysis);
router.get('/maps/categories', mapsController.getCategories);
router.get('/maps/photo', mapsController.getPlacePhoto);

module.exports = router;
