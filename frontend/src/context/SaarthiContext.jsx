import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { defaultBusinessPlans } from '../utils/defaultPlans';
import { extractBusinessIntent, generateDynamicBusinessAnalysis } from '../utils/businessPlanEngine';

const SaarthiContext = createContext(null);

export function SaarthiProvider({ children, auth, profile, onProfileUpdate, language = 'en', recommendations = null }) {
  // Current user identity ID
  const userId = auth?.user?.id || auth?.user?.phone || auth?.email || 'demo-user';

  // Key for localStorage persistence per user
  const storageKey = `udyam_plans_${userId}`;

  // Loading and error states for database persistence
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [planError, setPlanError] = useState(null);

  // Load user's saved personal business plans from localStorage initially
  const [personalPlans, setPersonalPlans] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Error reading personal business plans:", e);
    }
    return [];
  });

  // Active Business Plan ID
  const [activePlanId, setActivePlanId] = useState(() => {
    try {
      const savedPlans = localStorage.getItem(storageKey);
      if (savedPlans) {
        const parsed = JSON.parse(savedPlans);
        if (parsed && parsed.length > 0) {
          return parsed[0].id; // Newest personal plan
        }
      }
    } catch (e) {}
    return defaultBusinessPlans[0].id; // Fallback to first default plan
  });

  // Pending business idea state awaiting confirmation in chat
  const [pendingBusinessIdea, setPendingBusinessIdea] = useState(null);

  // Cross-component map search state (e.g. when triggered from AI chat)
  const [mapSearchState, setMapSearchState] = useState({
    query: '',
    category: 'ALL',
    radius_km: 5.0
  });

  // Fetch saved business plans from Supabase backend for authenticated user
  const fetchSavedPlans = async () => {
    if (!auth || !auth.isAuthenticated) return;
    setIsLoadingPlans(true);
    setPlanError(null);
    try {
      const res = await axios.get('/api/business-plans');
      if (res.data && Array.isArray(res.data.plans)) {
        if (res.data.plans.length > 0) {
          setPersonalPlans(res.data.plans);
          setActivePlanId(prev => {
            // 1. If currently selected plan exists in fetched list, keep it
            const exists = res.data.plans.some(p => p.id === prev);
            if (exists) return prev;

            // 2. If profile has a business_interest that matches one of the saved plans, select it
            if (profile?.business_interest) {
              const interest = profile.business_interest.toLowerCase();
              const matched = res.data.plans.find(p => {
                const name = (p.businessName || p.plan_title || '').toLowerCase();
                const type = (p.category_code || p.business_type || '').toLowerCase();
                return name.includes(interest) || interest.includes(name) ||
                       (interest.includes('kirana') && type.includes('kirana')) ||
                       (interest.includes('poultry') && type.includes('poultry')) ||
                       (interest.includes('mushroom') && type.includes('mushroom')) ||
                       (interest.includes('machinery') && type.includes('hiring')) ||
                       (interest.includes('dairy') && type.includes('dairy'));
              });
              if (matched) return matched.id;
            }

            // 3. Fallback to newest personal plan
            return res.data.plans[0].id;
          });
        }
      }
    } catch (err) {
      console.warn("Notice loading saved plans from Supabase:", err.message);
      setPlanError(err.response?.data?.error || err.message);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  // Synchronize plans from Supabase when user authentication session changes
  useEffect(() => {
    if (auth && auth.isAuthenticated) {
      fetchSavedPlans();
    }
  }, [auth?.user?.id, auth?.isAuthenticated]);

  // Sync personal plans to localStorage whenever modified
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(personalPlans));
    } catch (e) {
      console.warn("Error saving personal business plans:", e);
    }
  }, [personalPlans, storageKey]);

  // Combine personal plans (first, newest first) + default reference plans
  const allPlans = [...personalPlans, ...defaultBusinessPlans];

  // Helper to get current active plan object
  const getActivePlan = () => {
    const found = allPlans.find(p => p.id === activePlanId);
    if (found) return found;

    if (recommendations && recommendations.top_recommendation) {
      const recCat = recommendations.top_recommendation.category_code;
      const matching = personalPlans.find(p => p.category_code === recCat || p.business_type === recCat);
      if (matching) return matching;
    }

    return personalPlans[0] || defaultBusinessPlans[0];
  };

  // Helper to get active recommendation object payload for sub-components
  const getActiveRecommendationPayload = () => {
    const activePlan = getActivePlan();
    if (!activePlan) return recommendations || null;

    const raw = activePlan.rawRecommendation || (recommendations?.top_recommendation);
    return {
      total_candidates_analyzed: defaultBusinessPlans.length + personalPlans.length,
      viable_candidates_count: allPlans.length,
      filtered_out: [],
      top_recommendation: raw,
      all_recommendations: allPlans.map(p => p.rawRecommendation || {}),
      alternatives: allPlans.slice(1).map(p => p.rawRecommendation || {})
    };
  };

  // Save a business plan directly to Supabase PostgreSQL database
  const savePlanToDatabase = async (planToSave) => {
    if (!auth || !auth.isAuthenticated || !planToSave) return planToSave;
    try {
      const isUuid = planToSave.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planToSave.id);
      const payload = {
        id: isUuid ? planToSave.id : undefined,
        plan_title: planToSave.businessName || planToSave.plan_title || planToSave.rawRecommendation?.name_en || 'Rural Micro-Enterprise',
        business_type: planToSave.category_code || planToSave.category || planToSave.business_type || planToSave.rawRecommendation?.category_code || 'MICRO_ENTERPRISE',
        capital: parseFloat(planToSave.capital !== undefined && planToSave.capital !== null ? planToSave.capital : (planToSave.available_capital || profile?.available_capital || 0)),
        location: planToSave.location || {},
        status: planToSave.status || 'ACTIVE',
        financial_details: planToSave.financials || planToSave.financial_details || planToSave.rawRecommendation?.financials || {},
        plan_content: planToSave
      };
      const res = await axios.post('/api/business-plans', payload);
      if (res.data && res.data.plan) {
        const saved = res.data.plan;
        setPersonalPlans(prev => {
          const without = prev.filter(p => p.id !== planToSave.id && p.id !== saved.id && p.business_type !== saved.business_type && p.category_code !== saved.category_code);
          return [saved, ...without];
        });
        setActivePlanId(saved.id);
        return saved;
      }
    } catch (err) {
      console.warn("Notice saving plan to database:", err.message);
    }
    return planToSave;
  };

  // Create or activate a Personal Business Plan directly from a calculated AI recommendation
  const activateRecommendationAsPlan = async (recommendation, authProfile = null) => {
    if (!recommendation) return null;
    const prof = authProfile || profile;

    const catCode = recommendation.category_code;
    const existing = personalPlans.find(p => 
      (catCode && (p.category_code === catCode || p.business_type === catCode)) ||
      (p.businessName && recommendation.name_en && p.businessName.toLowerCase() === recommendation.name_en.toLowerCase())
    );

    if (existing) {
      setActivePlanId(existing.id);
      return existing;
    }

    const planObj = {
      id: `plan_${Date.now()}`,
      userId: userId,
      type: 'personal',
      isPersonal: true,
      source: 'advisory',
      businessName: recommendation.name_en || prof?.business_interest || 'Rural Micro-Enterprise',
      category: recommendation.sector || 'MICRO_ENTERPRISE',
      category_code: recommendation.category_code || 'MICRO_ENTERPRISE',
      description: recommendation.description || 'Custom rural micro-enterprise project.',
      description_hi: recommendation.description_hi,
      description_te: recommendation.description_te,
      location: {
        village: prof?.village_name || '',
        mandal: prof?.mandal_or_block || '',
        district: prof?.district || '',
        state: prof?.state || '',
        latitude: prof?.latitude || null,
        longitude: prof?.longitude || null
      },
      capital: (prof?.available_capital !== undefined && prof?.available_capital !== null && !isNaN(parseFloat(prof.available_capital)))
        ? parseFloat(prof.available_capital) 
        : parseFloat(recommendation.capital || 0),
      requiredInvestment: recommendation.financials?.project_cost || 0,
      suitabilityScore: recommendation.overall_suitability_score || 90,
      confidenceScore: recommendation.confidence_score || 92,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      financials: recommendation.financials || {},
      market: recommendation.market || {},
      risks: recommendation.risks || {},
      top_scheme: recommendation.top_scheme || {},
      matched_schemes: recommendation.matched_schemes || [],
      why_recommended_en: recommendation.why_recommended_en,
      why_recommended_hi: recommendation.why_recommended_hi,
      why_recommended_te: recommendation.why_recommended_te,
      rawRecommendation: recommendation
    };

    if (auth && auth.isAuthenticated) {
      const saved = await savePlanToDatabase(planObj);
      return saved;
    } else {
      setPersonalPlans(prev => [planObj, ...prev.filter(p => p.category_code !== planObj.category_code)]);
      setActivePlanId(planObj.id);
      return planObj;
    }
  };

  // When fresh recommendations are calculated for the current profile, synchronize as active plan
  useEffect(() => {
    if (recommendations && recommendations.top_recommendation) {
      const topRec = recommendations.top_recommendation;
      const existing = personalPlans.find(p => 
        (p.category_code && p.category_code === topRec.category_code) ||
        (p.business_type && p.business_type === topRec.category_code) ||
        (p.businessName && topRec.name_en && p.businessName.toLowerCase() === topRec.name_en.toLowerCase())
      );
      if (existing) {
        if (profile?.available_capital && Number(existing.capital) !== Number(profile.available_capital)) {
          updatePlan(existing.id, {
            capital: parseFloat(profile.available_capital),
            location: {
              village: profile.village_name || '',
              district: profile.district || '',
              state: profile.state || ''
            }
          });
        }
        setActivePlanId(existing.id);
      } else if (auth && auth.isAuthenticated) {
        activateRecommendationAsPlan(topRec, profile);
      }
    }
  }, [recommendations?.top_recommendation?.category_code, recommendations?.top_recommendation?.name_en, profile?.available_capital, profile?.village_name]);

  // Create a new Personal Business Plan from extracted intent and persist to Supabase
  const createPlanFromIntent = async (intentInput) => {
    const intent = typeof intentInput === 'string' 
      ? extractBusinessIntent(intentInput, profile) 
      : intentInput;

    const newPlan = generateDynamicBusinessAnalysis(intent, profile, userId);
    setPendingBusinessIdea(null);

    if (auth && auth.isAuthenticated) {
      const saved = await savePlanToDatabase(newPlan);
      return saved;
    } else {
      setPersonalPlans(prev => {
        const without = prev.filter(p => p.category_code !== newPlan.category_code);
        return [newPlan, ...without];
      });
      setActivePlanId(newPlan.id);
      return newPlan;
    }
  };

  // Synchronize or generate authoritative Personal Business Plan directly from entrepreneur profile
  const syncPlanWithProfile = (authProfile) => {
    if (!authProfile) return null;
    const p = authProfile;
    if (!p.available_capital && !p.village_name && !p.business_interest) return null;

    // Check if user already has a persistent saved plan matching current profile's business interest
    if (personalPlans.length > 0 && p.business_interest) {
      const interest = p.business_interest.toLowerCase();
      const matched = personalPlans.find(plan => {
        const titleLower = (plan.businessName || plan.plan_title || '').toLowerCase();
        const catLower = (plan.category_code || plan.business_type || '').toLowerCase();
        return titleLower.includes(interest) || interest.includes(titleLower) ||
               (interest.includes('kirana') && catLower.includes('kirana')) ||
               (interest.includes('poultry') && catLower.includes('poultry')) ||
               (interest.includes('mushroom') && catLower.includes('mushroom')) ||
               (interest.includes('machinery') && catLower.includes('hiring')) ||
               (interest.includes('dairy') && catLower.includes('dairy'));
      });
      if (matched) {
        setActivePlanId(matched.id);
        return matched;
      }
    }

    return null;
  };

  // Update an existing Business Plan
  const updatePlan = async (planId, updatedFields = {}) => {
    setPersonalPlans(prev => prev.map(p => {
      if (p.id === planId) {
        // If capital or details updated, recalculate analysis
        const updatedIntent = extractBusinessIntent(
          updatedFields.businessIdea || p.businessName,
          { ...profile, available_capital: updatedFields.capital || p.capital }
        );
        const recalculated = generateDynamicBusinessAnalysis(updatedIntent, profile, userId);
        const merged = {
          ...p,
          ...recalculated,
          ...updatedFields,
          id: planId, // preserve original ID
          updatedAt: new Date().toISOString()
        };

        // If persisted in Supabase with UUID, update backend
        if (auth && auth.isAuthenticated && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId)) {
          axios.put(`/api/business-plans/${planId}`, {
            plan_title: merged.businessName,
            capital: merged.capital,
            financial_details: merged.financials,
            plan_content: merged
          }).catch(e => console.warn("Notice updating plan on backend:", e.message));
        }

        return merged;
      }
      return p;
    }));
  };

  // Delete a Personal Business Plan
  const deletePlan = async (planId) => {
    setPersonalPlans(prev => {
      const filtered = prev.filter(p => p.id !== planId);
      if (activePlanId === planId) {
        setActivePlanId(filtered.length > 0 ? filtered[0].id : defaultBusinessPlans[0].id);
      }
      return filtered;
    });

    if (auth && auth.isAuthenticated && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(planId)) {
      try {
        await axios.delete(`/api/business-plans/${planId}`);
      } catch (err) {
        console.warn("Notice deleting plan from database:", err.message);
      }
    }
  };

  const activePlan = getActivePlan();

  const contextValue = {
    userId,
    profile,
    onProfileUpdate,
    language,
    isLoadingPlans,
    planError,
    fetchSavedPlans,
    savePlanToDatabase,
    activateRecommendationAsPlan,
    personalPlans,
    savedPlans: personalPlans,
    defaultPlans: defaultBusinessPlans,
    allPlans,
    userPlans: personalPlans.length > 0 ? personalPlans : defaultBusinessPlans,
    activePlan,
    activePlanId,
    setActivePlanId,
    getActivePlan,
    getActiveRecommendationPayload,
    pendingBusinessIdea,
    setPendingBusinessIdea,
    mapSearchState,
    setMapSearchState,
    createPlanFromIntent,
    syncPlanWithProfile,
    updatePlan,
    deletePlan
  };

  return (
    <SaarthiContext.Provider value={contextValue}>
      {children}
    </SaarthiContext.Provider>
  );
}

export function useSaarthi() {
  const context = useContext(SaarthiContext);
  if (!context) {
    console.warn("useSaarthi used outside SaarthiProvider context, returning safe defaults.");
    return {
      userId: 'demo-user',
      isLoadingPlans: false,
      planError: null,
      fetchSavedPlans: () => {},
      savePlanToDatabase: () => {},
      activateRecommendationAsPlan: () => {},
      personalPlans: [],
      savedPlans: [],
      defaultPlans: defaultBusinessPlans,
      allPlans: defaultBusinessPlans,
      userPlans: defaultBusinessPlans,
      activePlan: defaultBusinessPlans[0],
      activePlanId: defaultBusinessPlans[0].id,
      setActivePlanId: () => {},
      getActivePlan: () => defaultBusinessPlans[0],
      getActiveRecommendationPayload: () => null,
      pendingBusinessIdea: null,
      setPendingBusinessIdea: () => {},
      mapSearchState: { query: '', category: 'ALL', radius_km: 5.0 },
      setMapSearchState: () => {},
      createPlanFromIntent: () => defaultBusinessPlans[0],
      syncPlanWithProfile: () => defaultBusinessPlans[0],
      updatePlan: () => {},
      deletePlan: () => {}
    };
  }
  return context;
}
