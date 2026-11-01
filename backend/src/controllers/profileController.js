const db = require('../config/db');

/**
 * Format a raw database row (with optional joined location) into a standardized profile object.
 */
function formatProfile(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name || '',
    phone: row.phone || '',
    social_category: row.social_category || 'OBC',
    gender: row.gender || 'MALE',
    annual_family_income: row.annual_family_income !== null ? parseFloat(row.annual_family_income) : 180000.0,
    available_capital: row.available_capital !== null ? parseFloat(row.available_capital) : 0.0,
    liquid_reserve: row.liquid_reserve !== null ? parseFloat(row.liquid_reserve) : 20000.0,
    land_acres: row.land_acres !== null ? parseFloat(row.land_acres) : 0.0,
    has_shop_building: Boolean(row.has_shop_building),
    has_vehicle: Boolean(row.has_vehicle),
    has_machinery: Boolean(row.has_machinery),
    has_electricity: row.has_electricity !== null ? Boolean(row.has_electricity) : true,
    has_water_source: row.has_water_source !== null ? Boolean(row.has_water_source) : true,
    has_internet: row.has_internet !== null ? Boolean(row.has_internet) : true,
    has_storage_facility: Boolean(row.has_storage_facility),
    skills: Array.isArray(row.skills) ? row.skills : [],
    experience_years: row.experience_years !== null ? parseInt(row.experience_years, 10) : 0,
    business_interest: row.business_interest || '',
    target_monthly_income: row.target_monthly_income !== null ? parseFloat(row.target_monthly_income) : 25000.0,
    risk_preference: row.risk_preference || 'MODERATE',
    preferred_language: row.preferred_language || 'hi',
    location_id: row.location_id || null,
    village_name: row.village_name || '',
    mandal_or_block: row.mandal_or_block || '',
    district: row.district || '',
    state: row.state || '',
    pincode: (row.pincode && row.pincode !== '000000' && row.pincode !== 'null') ? row.pincode.trim() : '',
    latitude: row.latitude !== null && row.latitude !== undefined ? parseFloat(row.latitude) : null,
    longitude: row.longitude !== null && row.longitude !== undefined ? parseFloat(row.longitude) : null,
    address: row.address || '',
    photo: row.photo || '',
    post: row.post || '',
    police_station: row.police_station || '',
    analysis_radius_km: row.analysis_radius_km !== null ? parseFloat(row.analysis_radius_km) : 10.0,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

/**
 * Helper to resolve the authenticated user's PostgreSQL UUID.
 */
async function resolveUserId(user) {
  if (!user) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  
  if (user.id && uuidRegex.test(user.id)) {
    return user.id;
  }

  if (user.email) {
    const userRes = await db.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [user.email.toLowerCase()]
    );
    if (userRes.rows.length > 0) {
      return userRes.rows[0].id;
    }
  }

  return null;
}

/**
 * Authenticated GET /api/profile
 * Retrieves the entrepreneur profile belonging strictly to the authenticated user.
 */
exports.getProfile = async (req, res) => {
  try {
    const userId = await resolveUserId(req.user);
    if (!userId) {
      return res.json({
        id: null,
        user_id: null,
        name: req.user?.name || '',
        phone: '',
        photo: '',
        gender: 'MALE',
        address: '',
        social_category: 'OBC',
        annual_family_income: 180000.0,
        state: '',
        district: '',
        mandal_or_block: '',
        village_name: '',
        pincode: '',
        post: '',
        police_station: '',
        latitude: null,
        longitude: null,
        available_capital: 300000.0,
        liquid_reserve: 20000.0,
        land_acres: 1.0,
        has_shop_building: false,
        has_vehicle: false,
        has_machinery: false,
        has_electricity: true,
        has_water_source: true,
        has_internet: true,
        has_storage_facility: false,
        skills: [],
        experience_years: 0,
        business_interest: '',
        target_monthly_income: 25000.0,
        risk_preference: 'MODERATE',
        preferred_language: 'hi',
        analysis_radius_km: 10.0,
        hasProfile: false
      });
    }

    const result = await db.query(
      `SELECT 
        e.*,
        l.village_name,
        l.mandal_or_block,
        l.district,
        l.state,
        l.pincode,
        COALESCE(e.custom_latitude, l.latitude) as latitude,
        COALESCE(e.custom_longitude, l.longitude) as longitude
       FROM entrepreneurs e
       LEFT JOIN locations l ON e.location_id = l.id
       WHERE e.user_id = $1
       LIMIT 1`,
      [userId]
    );

    if (result.rows.length === 0) {
      // Return initial profile skeleton prefilled with user account details
      return res.json({
        id: null,
        user_id: userId,
        name: req.user.name || '',
        phone: req.user.phone || req.user.mobile || '',
        photo: '',
        gender: 'MALE',
        address: '',
        social_category: 'OBC',
        annual_family_income: 180000.0,
        state: '',
        district: '',
        mandal_or_block: '',
        village_name: '',
        pincode: '',
        post: '',
        police_station: '',
        latitude: null,
        longitude: null,
        available_capital: 300000.0,
        liquid_reserve: 20000.0,
        land_acres: 1.0,
        has_shop_building: false,
        has_vehicle: false,
        has_machinery: false,
        has_electricity: true,
        has_water_source: true,
        has_internet: true,
        has_storage_facility: false,
        skills: [],
        experience_years: 0,
        business_interest: '',
        target_monthly_income: 25000.0,
        risk_preference: 'MODERATE',
        preferred_language: req.user.preferredLanguage || 'hi',
        analysis_radius_km: 10.0,
        hasProfile: false
      });
    }

    const formatted = formatProfile(result.rows[0]);
    formatted.hasProfile = true;
    return res.json(formatted);

  } catch (error) {
    console.error('[Get Profile Error]', error);
    return res.status(500).json({ error: 'Internal server error retrieving entrepreneur profile.' });
  }
};

/**
 * Authenticated POST / PUT /api/profile
 * Upserts the entrepreneur profile for the authenticated user in PostgreSQL.
 * Strictly verifies user identity to prevent cross-user modifications.
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = await resolveUserId(req.user);
    const body = req.body || {};

    if (!userId) {
      return res.json({
        message: 'Profile updated for guest session.',
        profile: {
          ...body,
          hasProfile: true,
          available_capital: parseFloat(body.available_capital) || 0
        }
      });
    }

    // Validate required fields
    let name = body.name !== undefined ? body.name : req.user.name;
    name = (typeof name === 'string' ? name : '').trim();
    if (!name) {
      return res.status(400).json({ error: 'Entrepreneur full name is required.' });
    }

    const availableCapital = parseFloat(body.available_capital);
    if (isNaN(availableCapital) || availableCapital < 0) {
      return res.status(400).json({ error: 'Available capital must be a valid non-negative number.' });
    }

    // Coerce numeric & boolean fields with safe defaults
    const phone = (body.phone || req.user.phone || '').trim();
    const socialCategory = (body.social_category || 'OBC').toUpperCase();
    const gender = (body.gender || 'MALE').toUpperCase();
    const annualFamilyIncome = parseFloat(body.annual_family_income) || 180000.0;
    const liquidReserve = parseFloat(body.liquid_reserve) || 20000.0;
    const landAcres = parseFloat(body.land_acres) >= 0 ? parseFloat(body.land_acres) : 0.0;
    const hasShopBuilding = Boolean(body.has_shop_building);
    const hasVehicle = Boolean(body.has_vehicle);
    const hasMachinery = Boolean(body.has_machinery);
    const hasElectricity = body.has_electricity !== undefined ? Boolean(body.has_electricity) : true;
    const hasWaterSource = body.has_water_source !== undefined ? Boolean(body.has_water_source) : true;
    const hasInternet = body.has_internet !== undefined ? Boolean(body.has_internet) : true;
    const hasStorageFacility = Boolean(body.has_storage_facility);
    const skills = Array.isArray(body.skills) ? body.skills.filter(s => typeof s === 'string') : [];
    const experienceYears = parseInt(body.experience_years, 10) || 0;
    const businessInterest = (body.business_interest || '').trim();
    const targetMonthlyIncome = parseFloat(body.target_monthly_income) || 25000.0;
    const riskPreference = (body.risk_preference || 'MODERATE').toUpperCase();
    const preferredLanguage = (body.preferred_language || req.user.preferredLanguage || 'hi').toLowerCase();
    const address = (body.address || '').trim();
    const photo = typeof body.photo === 'string' ? body.photo : '';
    const post = (body.post || '').trim();
    const policeStation = (body.police_station || '').trim();
    const analysisRadiusKm = parseFloat(body.analysis_radius_km) || 10.0;

    const customLat = body.latitude !== null && body.latitude !== undefined && !isNaN(parseFloat(body.latitude))
      ? parseFloat(body.latitude)
      : null;
    const customLon = body.longitude !== null && body.longitude !== undefined && !isNaN(parseFloat(body.longitude))
      ? parseFloat(body.longitude)
      : null;

    // Check if entrepreneur record already exists for this authenticated user
    const existingCheck = await db.query(
      `SELECT e.id, e.location_id, l.village_name, l.district, l.state, l.pincode
       FROM entrepreneurs e
       LEFT JOIN locations l ON e.location_id = l.id
       WHERE e.user_id = $1 LIMIT 1`,
      [userId]
    );

    const prevProfile = existingCheck.rows[0] || null;
    let locationId = body.location_id || null;
    const villageName = (body.village_name || '').trim();
    const mandalOrBlock = (body.mandal_or_block || '').trim();
    const district = (body.district || '').trim();
    const state = (body.state || '').trim();

    // Check if location changed
    const locChanged = prevProfile && (
      (villageName && prevProfile.village_name && prevProfile.village_name.toLowerCase() !== villageName.toLowerCase()) ||
      (state && prevProfile.state && prevProfile.state.toLowerCase() !== state.toLowerCase())
    );

    let finalPincode = (body.pincode || '').trim();
    // Requirements: Never reuse an old PIN when the village/state changes.
    // If a PIN has not been provided or verified, display it as unavailable rather than showing a stale value.
    // Do not invent or automatically assign a PIN.
    if (locChanged && prevProfile.pincode && finalPincode === prevProfile.pincode) {
      finalPincode = '';
    }
    if (finalPincode === '000000' || finalPincode === 'null') {
      finalPincode = '';
    }

    if (locChanged) {
      locationId = null; // Do not reuse old location ID from previous place
    }

    if (villageName && state) {
      try {
        const locCheck = await db.query(
          `SELECT id, pincode FROM locations 
           WHERE LOWER(village_name) = LOWER($1) 
             AND LOWER(state) = LOWER($2)
             AND (LOWER(district) = LOWER($3) OR $3 = '')
           LIMIT 1`,
          [villageName, state, district]
        );

        if (locCheck.rows.length > 0) {
          locationId = locCheck.rows[0].id;
          const dbPincode = locCheck.rows[0].pincode;
          // If user provided a new valid PIN:
          if (finalPincode && finalPincode !== dbPincode) {
            await db.query(`UPDATE locations SET pincode = $1 WHERE id = $2`, [finalPincode, locationId]);
          } else if (!finalPincode && locChanged && dbPincode === prevProfile?.pincode) {
            // Clean out stale previous PIN retained in DB location row
            await db.query(`UPDATE locations SET pincode = '' WHERE id = $1`, [locationId]);
          }
        } else {
          const lat = customLat || 20.0;
          const lon = customLon || 78.0;
          const newLocRes = await db.query(
            `INSERT INTO locations (village_name, mandal_or_block, district, state, pincode, latitude, longitude, geom)
             VALUES ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, ST_SetSRID(ST_MakePoint($7::double precision, $6::double precision), 4326))
             RETURNING id`,
            [villageName, mandalOrBlock || villageName, district || villageName, state, finalPincode || '', lat, lon]
          );
          locationId = newLocRes.rows[0].id;
        }
      } catch (locErr) {
        console.warn('[Location Resolution Notice]', locErr.message);
      }
    }

    let savedRow;

    if (existingCheck.rows.length > 0) {
      // UPDATE existing profile
      const updateResult = await db.query(
        `UPDATE entrepreneurs SET
          name = $1,
          phone = $2,
          social_category = $3,
          gender = $4,
          annual_family_income = $5,
          location_id = $6,
          custom_latitude = $7,
          custom_longitude = $8,
          available_capital = $9,
          liquid_reserve = $10,
          land_acres = $11,
          has_shop_building = $12,
          has_vehicle = $13,
          has_machinery = $14,
          has_electricity = $15,
          has_water_source = $16,
          has_internet = $17,
          has_storage_facility = $18,
          skills = $19,
          experience_years = $20,
          business_interest = $21,
          target_monthly_income = $22,
          risk_preference = $23,
          preferred_language = $24,
          address = $25,
          photo = $26,
          post = $27,
          police_station = $28,
          analysis_radius_km = $29,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $30
        RETURNING *`,
        [
          name, phone, socialCategory, gender, annualFamilyIncome,
          locationId, customLat, customLon, availableCapital,
          liquidReserve, landAcres, hasShopBuilding, hasVehicle,
          hasMachinery, hasElectricity, hasWaterSource, hasInternet,
          hasStorageFacility, skills, experienceYears, businessInterest,
          targetMonthlyIncome, riskPreference, preferredLanguage,
          address, photo, post, policeStation, analysisRadiusKm,
          userId
        ]
      );
      savedRow = updateResult.rows[0];
    } else {
      // INSERT new profile
      const insertResult = await db.query(
        `INSERT INTO entrepreneurs (
          user_id, name, phone, social_category, gender, annual_family_income,
          location_id, custom_latitude, custom_longitude, available_capital,
          liquid_reserve, land_acres, has_shop_building, has_vehicle,
          has_machinery, has_electricity, has_water_source, has_internet,
          has_storage_facility, skills, experience_years, business_interest,
          target_monthly_income, risk_preference, preferred_language,
          address, photo, post, police_station, analysis_radius_km
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12, $13, $14,
          $15, $16, $17, $18,
          $19, $20, $21, $22,
          $23, $24, $25,
          $26, $27, $28, $29, $30
        )
        RETURNING *`,
        [
          userId, name, phone, socialCategory, gender, annualFamilyIncome,
          locationId, customLat, customLon, availableCapital,
          liquidReserve, landAcres, hasShopBuilding, hasVehicle,
          hasMachinery, hasElectricity, hasWaterSource, hasInternet,
          hasStorageFacility, skills, experienceYears, businessInterest,
          targetMonthlyIncome, riskPreference, preferredLanguage,
          address, photo, post, policeStation, analysisRadiusKm
        ]
      );
      savedRow = insertResult.rows[0];
    }

    // Attach location details for frontend convenience
    savedRow.village_name = villageName;
    savedRow.mandal_or_block = mandalOrBlock;
    savedRow.district = district;
    savedRow.state = state;
    savedRow.pincode = finalPincode;
    savedRow.latitude = customLat;
    savedRow.longitude = customLon;

    const formatted = formatProfile(savedRow);
    formatted.hasProfile = true;

    return res.json({
      message: 'Entrepreneur profile saved successfully',
      profile: formatted
    });

  } catch (error) {
    console.error('[Update Profile Error]', error);
    return res.status(500).json({ error: 'Internal server error while saving entrepreneur profile.' });
  }
};
