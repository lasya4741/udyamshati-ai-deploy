import json
from typing import List, Dict, Any, Optional
from app.config import BUSINESS_CATALOG_PATH, WEIGHTS
from app.market_engine.gis_service import MarketEngine
from app.finance_engine.structuring_service import FinanceEngine
from app.scheme_engine.rule_evaluator import SchemeRuleEngine
from app.risk_engine.risk_analyzer import RiskEngine

CATEGORY_INTENT_KEYWORDS = {
    "DAIRY_FARMING": ["dairy", "milk", "cow", "buffalo", "cattle", "दुग्ध", "डेयरी", "పాడి"],
    "AGRI_EQUIPMENT_RENTAL": ["custom hiring", "hiring centre", "hiring center", "tractor rental", "machinery rental", "equipment rental", "farm machinery rental", "कस्टम हायरिंग"],
    "KIRANA_DAILY_NEEDS": ["kirana", "provisions", "grocery", "daily needs", "general store", "daily store", "किराना"],
    "MUSHROOM_FARMING": ["mushroom", "मशरूम", "పుట్టగొడుగు"],
    "FOOD_PROCESSING_MILL": ["flour mill", "spices mill", "oil mill", "oil expeller", "grain mill", "expeller", "pulverizer", "आटा मिल", "मसाला मिल", "तेल मिल"],
    "POULTRY_BROILER": ["poultry", "broiler", "chicken", "पोल्ट्री", "मुर्गी"],
    "VEGETABLE_FARMING": ["polyhouse", "greenhouse", "precision vegetable", "पॉलीहाउस"],
    "GOAT_REARING": ["goat", "bakri", "बकरी पालन"],
    "SOLAR_ENERGY": ["solar", "सौर"],
    "GARMENT_TAILORING": ["tailoring", "garment", "boutique", "सिलाई"]
}

def matches_business_intent(user_interest: str, category_code: str, biz_name: str = "") -> bool:
    if not user_interest:
        return False
    ui = user_interest.lower().strip()
    code = category_code.upper().strip()
    
    keywords = CATEGORY_INTENT_KEYWORDS.get(code, [])
    if any(k in ui for k in keywords):
        return True
    
    stopwords = {"farming", "farm", "commercial", "unit", "rural", "centre", "center", "store", "mill"}
    ui_words = [w.strip("(),.") for w in ui.split() if len(w.strip("(),.")) >= 3 and w.strip("(),.") not in stopwords]
    name_words = [w.strip("(),.") for w in biz_name.lower().split() if len(w.strip("(),.")) >= 3 and w.strip("(),.") not in stopwords]
    if any(w in name_words for w in ui_words):
        return True

    return False

class RecommendationEngine:
    def __init__(self):
        self._load_catalog()
        self.market_engine = MarketEngine()
        self.finance_engine = FinanceEngine()
        self.scheme_engine = SchemeRuleEngine()
        self.risk_engine = RiskEngine()

    def _load_catalog(self):
        try:
            with open(BUSINESS_CATALOG_PATH, 'r', encoding='utf-8') as f:
                self.catalog = json.load(f)
        except Exception:
            self.catalog = []

    def evaluate_recommendations(self, profile: Dict[str, Any], radius_km: float = 10.0) -> Dict[str, Any]:
        """
        Executes candidate generation, hard filtering, and multi-factor ranking.
        """
        capital = float(profile.get("available_capital", 300000.0))
        liquid_reserve = float(profile.get("liquid_reserve", 20000.0))
        land_acres = float(profile.get("land_acres", 1.0))
        has_water = bool(profile.get("has_water_source", True))
        has_power = bool(profile.get("has_electricity", True))
        lat = float(profile.get("latitude", 20.1706))
        lon = float(profile.get("longitude", 73.9840))
        user_skills = [s.lower().strip() for s in profile.get("skills", [])]
        user_interest = (profile.get("business_interest") or "").lower().strip()

        ranked_results = []
        filtered_out = []

        for biz in self.catalog:
            code = biz.get("category_code")
            min_cap = float(biz.get("min_capital", 100000.0))
            min_land = float(biz.get("min_land_acres", 0.0))
            req_water = bool(biz.get("requires_water", False))
            req_power = bool(biz.get("requires_three_phase_power", False))

            # Filter Check 1: Land Feasibility
            if land_acres < min_land:
                filtered_out.append({
                    "category_code": code,
                    "reason": f"Requires minimum {min_land} acres of land (entrepreneur has {land_acres} acres)"
                })
                continue

            # Filter Check 2: Water Availability
            if req_water and not has_water:
                filtered_out.append({
                    "category_code": code,
                    "reason": "Requires dependable agricultural water source"
                })
                continue

            # Filter Check 3: Minimum Margin Feasibility (10% beneficiary margin rule)
            # Beneficiary's capital must at least cover the 10% own contribution for min capital
            min_margin_needed = min_cap * 0.10
            if (capital - liquid_reserve) < min_margin_needed:
                filtered_out.append({
                    "category_code": code,
                    "reason": f"Available investable capital below required 10% margin of ₹{min_margin_needed:,.0f}"
                })
                continue

            # Feasible candidate - Run specialist engines:

            # 1. Market Engine
            market_res = self.market_engine.analyze_market(lat, lon, code, radius_km)
            market_score = market_res["market_opportunity_score"]

            # 2. Finance Engine
            # Target project cost = typical project cost, bounded by min/max and entrepreneur capacity
            typical_cost = float(biz.get("typical_project_cost", min_cap * 1.5))
            # If entrepreneur has large capital, scale up slightly
            target_cost = min(float(biz.get("max_capital", typical_cost)), max(min_cap, typical_cost))
            
            base_rev = float(biz.get("base_monthly_revenue", 60000.0))
            base_exp = float(biz.get("base_monthly_expense", 40000.0))

            finance_res = self.finance_engine.structure_project(
                project_cost=target_cost,
                available_capital=capital,
                liquid_reserve=liquid_reserve,
                base_monthly_revenue=base_rev,
                base_monthly_expense=base_exp
            )
            financial_score = finance_res["financial_score"]

            # 3. Skill Compatibility Score
            req_skills = [s.lower() for s in biz.get("skills_required", [])]
            if any(s in user_skills for s in req_skills):
                skill_score = 95.0
            elif "general" in req_skills or len(user_skills) == 0:
                skill_score = 75.0
            else:
                skill_score = 55.0

            # Direct business interest matching
            is_direct_interest_match = matches_business_intent(user_interest, code, biz.get("name_en", ""))
            if is_direct_interest_match:
                skill_score = min(100.0, skill_score + 15.0)

            # Asset & land readiness bonus (machinery, power, land)
            if code == "AGRI_EQUIPMENT_RENTAL" and (bool(profile.get("has_machinery")) or "machinery" in user_skills):
                skill_score = min(100.0, skill_score + 10.0)

            # 4. Profitability Score
            margin_pct = float(biz.get("typical_margin_pct", 25.0))
            monthly_profit = finance_res["projected_monthly_operating_profit"]
            profit_score = min(100.0, max(40.0, (margin_pct * 1.8) + (monthly_profit / 2500.0)))
            profit_score = round(profit_score, 1)

            # 5. Competition Score
            competition_score = market_res["competition_score"]

            # 6. Risk Engine & Safety Score
            risk_res = self.risk_engine.evaluate_risks(biz, market_res, finance_res, user_skills)
            risk_safety_score = risk_res["risk_safety_score"]

            # 7. Stress Test
            stress_res = self.risk_engine.stress_test(
                base_rev,
                base_exp,
                finance_res["monthly_emi"]
            )

            # 8. Matched Government Schemes
            matched_schemes = self.scheme_engine.evaluate_schemes(profile, target_cost)
            top_scheme = matched_schemes[0] if matched_schemes else None

            # Composite Multi-Factor Score:
            # 30% Market + 20% Financial + 15% Skill + 15% Profitability + 10% Competition + 10% Risk Safety
            w = WEIGHTS
            final_score = (
                w["market"] * market_score +
                w["capital"] * financial_score +
                w["skill"] * skill_score +
                w["profitability"] * profit_score +
                w["competition"] * competition_score +
                w["risk_safety"] * risk_safety_score
            )
            if is_direct_interest_match:
                final_score = min(100.0, final_score + 12.0)
            final_score = round(min(100.0, max(20.0, final_score)), 1)

            # Data Confidence Score:
            market_conf = market_res["data_confidence_pct"]
            confidence = round(market_conf * 0.70 + 30.0 * (1.0 if top_scheme and top_scheme.get("is_eligible") else 0.8), 1)

            # Evidence & Why Recommended
            why_en = (
                f"High hyper-local demand index ({market_res['demand_index']}/100) with strong unmet gap ({market_res['demand_supply_gap']}). "
                f"Project requires ₹{finance_res['own_contribution_required']:,.0f} own margin with ₹{finance_res['loan_amount']:,.0f} "
                f"concessional loan via {top_scheme['title_en'] if top_scheme else 'MoSJE Schemes'}. "
                f"Projected DSCR is a robust {finance_res['dscr']}x, ensuring healthy debt service cushion."
            )

            why_hi = (
                f"स्थानीय मांग सूचकांक ({market_res['demand_index']}/100) बहुत मजबूत है और क्षेत्र में {market_res['demand_supply_gap']} का आपूर्ति अंतर है। "
                f"परियोजना में ₹{finance_res['own_contribution_required']:,.0f} स्वयं का अंशदान एवं ₹{finance_res['loan_amount']:,.0f} का रियायती ऋण आवश्यक है। "
                f"ऋण शोधन अनुपात (DSCR) {finance_res['dscr']}x है, जो सुरक्षित आय सुनिश्चित करता है।"
            )

            ranked_results.append({
                "category_code": code,
                "name_en": biz.get("name_en"),
                "name_hi": biz.get("name_hi"),
                "name_te": biz.get("name_te"),
                "sector": biz.get("sector"),
                "description": biz.get("description"),
                "overall_suitability_score": final_score,
                "confidence_score": confidence,
                "is_direct_interest_match": is_direct_interest_match,
                "sub_scores": {
                    "market_opportunity": market_score,
                    "financial_feasibility": financial_score,
                    "skill_compatibility": skill_score,
                    "profitability": profit_score,
                    "competition": competition_score,
                    "risk_safety": risk_safety_score
                },
                "financials": finance_res,
                "market": market_res,
                "risks": risk_res,
                "stress_test": stress_res,
                "matched_schemes": matched_schemes[:3],
                "top_scheme": top_scheme,
                "why_recommended_en": why_en,
                "why_recommended_hi": why_hi,
                "location": {
                    "village": profile.get("village_name") or "",
                    "district": profile.get("district") or "",
                    "state": profile.get("state") or "",
                    "latitude": lat,
                    "longitude": lon
                },
                "capital": capital
            })

        # Multi-factor ranking:
        # Explicit user-selected business intent takes priority over inferred recommendations.
        # If user explicitly specified a business interest, matching candidates are prioritized first.
        if user_interest:
            intent_matches = [r for r in ranked_results if r.get("is_direct_interest_match")]
            other_candidates = [r for r in ranked_results if not r.get("is_direct_interest_match")]
            
            intent_matches.sort(key=lambda x: x["overall_suitability_score"], reverse=True)
            other_candidates.sort(key=lambda x: x["overall_suitability_score"], reverse=True)
            
            ranked_results = intent_matches + other_candidates
        else:
            ranked_results.sort(key=lambda x: x["overall_suitability_score"], reverse=True)

        return {
            "total_candidates_analyzed": len(self.catalog),
            "viable_candidates_count": len(ranked_results),
            "filtered_out": filtered_out,
            "top_recommendation": ranked_results[0] if ranked_results else None,
            "alternatives": ranked_results[1:4] if len(ranked_results) > 1 else [],
            "all_recommendations": ranked_results
        }
