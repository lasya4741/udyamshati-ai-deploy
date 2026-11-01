import React, { useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  MapPin,
  Wallet,
  Landmark,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  FileText,
  UserCheck,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Compass,
  Edit2,
  Check,
  Coins,
  ChevronRight,
  ExternalLink,
  Tractor,
  Layers
} from 'lucide-react';
import HeroBanner from './HeroBanner';
import LowerDashboard from './LowerDashboard';
import { useSaarthi } from '../../context/SaarthiContext';
import { defaultBusinessPlans } from '../../utils/defaultPlans';
import { translations } from '../../locales/translations';

export default function HomeDashboard({
  auth,
  profile,
  onProfileUpdate,
  setActiveTab,
  language = 'en'
}) {
  const activeLang = language || 'en';
  const t = translations[activeLang] || translations.en;

  // Access business plan context
  const {
    personalPlans = [],
    defaultPlans = defaultBusinessPlans,
    allPlans = [],
    activePlan,
    setActivePlanId
  } = useSaarthi();

  const userName = auth?.name || auth?.user?.name || profile?.name || 'Entrepreneur';

  // ----------------------------------------------------
  // SECTION B: PROFILE COMPLETION CALCULATION
  // ----------------------------------------------------
  const profileChecks = [
    { label: 'Name & Identity', filled: Boolean(profile?.name) },
    { label: 'Contact Phone', filled: Boolean(profile?.phone) },
    { label: 'Catchment Location', filled: Boolean(profile?.district && profile?.state) },
    { 
      label: 'Available Capital', 
      filled: profile?.available_capital !== null && profile?.available_capital !== undefined && profile?.available_capital !== '' 
    },
    { label: 'Social Category', filled: Boolean(profile?.social_category) },
    { 
      label: 'Land or Premises', 
      filled: Boolean(profile?.land_acres !== null && profile?.land_acres !== undefined) || Boolean(profile?.has_shop_building) 
    },
    { 
      label: 'Skills & Experience', 
      filled: (Array.isArray(profile?.skills) && profile.skills.length > 0) || (profile?.experience_years !== null && profile?.experience_years !== undefined) 
    },
    { 
      label: 'Utilities (Power/Water)', 
      filled: profile?.has_electricity !== null && profile?.has_water_source !== null 
    }
  ];

  const filledCount = profileChecks.filter(c => c.filled).length;
  const totalCount = profileChecks.length;
  const profileCompletion = Math.round((filledCount / totalCount) * 100);

  // ----------------------------------------------------
  // SECTION D: LOCATION STATE & MANAGEMENT
  // ----------------------------------------------------
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [inputDistrict, setInputDistrict] = useState(profile?.district || 'Guntur');
  const [inputState, setInputState] = useState(profile?.state || 'Andhra Pradesh');

  const currentDistrict = profile?.district || 'Guntur';
  const currentState = profile?.state || 'Andhra Pradesh';
  const locationDisplay = `${currentDistrict}, ${currentState}`;

  const handleSaveLocation = (e) => {
    e.preventDefault();
    if (onProfileUpdate) {
      onProfileUpdate({
        ...profile,
        district: inputDistrict,
        state: inputState
      });
    }
    setIsEditingLocation(false);
  };

  // Top viable benchmark example opportunities to display in Section D
  // Always display the 4 benchmark reference opportunities, keeping them separate from personal saved plans
  const displayedOpportunities = React.useMemo(() => {
    return (defaultPlans && defaultPlans.length > 0) ? defaultPlans : defaultBusinessPlans;
  }, [defaultPlans]);

  // Multilingual helpers
  const labels = {
    en: {
      overviewTitle: "Entrepreneur Overview",
      overviewSubtitle: "Real-time readiness metrics for your rural enterprise",
      profileCompletion: "Profile Completion",
      profileSubtext: `${filledCount} of ${totalCount} verified attributes`,
      completeProfileBtn: "Complete Profile in AI Interviewer →",
      verifiedDossier: "Verified Dossier",
      savedPlans: "Saved Business Plans",
      plansSubtext: personalPlans.length > 0 
        ? `${personalPlans.length} active custom plans` 
        : "4 reference plans available",
      viewPlansBtn: personalPlans.length > 0 ? "View Saved Plans →" : "Explore Plans →",
      eligibleSchemes: "Eligible Government Schemes",
      schemesSubtext: "PMEGP, NBCFDC, Mudra & PM-Vishwakarma",
      exploreSchemesBtn: "Check Subsidies →",
      marketOpportunities: "Local Market Opportunities",
      marketSubtext: `${locationDisplay}`,
      exploreMarketBtn: "View Catchment Map →",
      quickActionsEyebrow: "⚡ CORE MODULES",
      quickActionsTitle: "Quick Actions",
      quickActionsSubtitle: "Instant access to evaluate, fund, and stress-test your enterprise",
      localHighlightsTitle: "Local Opportunity Highlights",
      localHighlightsSubtitle: `Tailored business opportunities and demand analysis for ${currentDistrict}`,
      changeLocation: "Change Location",
      cancel: "Cancel",
      save: "Save",
      districtLabel: "District / Town",
      stateLabel: "State",
      topViableOpps: "Top Viable Opportunities in Your Catchment",
      analyzeOpportunity: "Analyze Opportunity →",
      demandHighlightsTitle: "Local Market Demand Highlights",
      schemeHighlightsTitle: "Government Scheme Highlights",
      viewCatchmentMap: "Open Market Catchment Map →",
      exploreAllSchemes: "Explore All Eligible Schemes →",
      continueJourneyTitle: "Continue Your Journey",
      continueJourneySubtitle: "Pick up where you left off or start a new planning activity",
      activePlanTitle: "Active Business Plan",
      resumePlanning: "Resume Financial Planning →",
      reviewAnalysis: "Review Business Analysis →",
      viewDossier: "View Business Dossier →",
      incompleteDossierTitle: "Complete Your Registration Dossier",
      incompleteDossierDesc: "Your entrepreneur profile is missing key details (capital, land, or category). Complete the 5-minute interactive AI Voice Interview in Profile to qualify for higher credit subsidies.",
      completeProfileCta: "Complete Profile in AI Interviewer →",
      verifiedProfileTitle: "Entrepreneur Dossier Verified",
      verifiedProfileDesc: "All required profile attributes are verified. Your business plans and government scheme matches are fully personalized.",
      viewProfileDossier: "View Profile Dossier →",
      emptyPlansTitle: "Ready to launch your enterprise?",
      emptyPlansDesc: "You haven't created a personalized business plan yet. Explore curated rural business models or run a business analysis to build your custom 5-year financial plan.",
      exploreOppsCta: "Explore Business Opportunities →"
    },
    hi: {
      overviewTitle: "उद्यमी डैशबोर्ड अवलोकन",
      overviewSubtitle: "आपके ग्रामीण उद्यम के लिए वास्तविक समय के मेट्रिक्स",
      profileCompletion: "प्रोफाइल पूर्णता",
      profileSubtext: `${totalCount} में से ${filledCount} विवरण सत्यापित`,
      completeProfileBtn: "AI साक्षात्कार में प्रोफाइल पूरा करें →",
      verifiedDossier: "सत्यापित डोजियर",
      savedPlans: "सुरक्षित व्यापार योजनाएं",
      plansSubtext: personalPlans.length > 0 
        ? `${personalPlans.length} सक्रिय व्यक्तिगत योजनाएं` 
        : "4 संदर्भ योजनाएं उपलब्ध",
      viewPlansBtn: personalPlans.length > 0 ? "योजनाएं देखें →" : "अवसर खोजें →",
      eligibleSchemes: "पात्र सरकारी योजनाएं",
      schemesSubtext: "PMEGP, NBCFDC, मुद्रा और पीएम-विश्वकर्मा",
      exploreSchemesBtn: "सब्सिडी देखें →",
      marketOpportunities: "स्थानीय बाजार अवसर",
      marketSubtext: `${locationDisplay}`,
      exploreMarketBtn: "बाजार नक्शा देखें →",
      quickActionsEyebrow: "⚡ मुख्य मॉड्यूल",
      quickActionsTitle: "त्वरित कार्य (Quick Actions)",
      quickActionsSubtitle: "अपने उद्यम के मूल्यांकन, वित्तपोषण और जोखिम परीक्षण के लिए सीधे पहुँचें",
      localHighlightsTitle: "स्थानीय अवसर की मुख्य विशेषताएं",
      localHighlightsSubtitle: `${currentDistrict} के लिए अनुकूलित व्यावसायिक अवसर और मांग विश्लेषण`,
      changeLocation: "स्थान बदलें",
      cancel: "रद्द करें",
      save: "सुरक्षित करें",
      districtLabel: "जिला / शहर",
      stateLabel: "राज्य",
      topViableOpps: "आपके क्षेत्र में शीर्ष व्यावहारिक अवसर",
      analyzeOpportunity: "अवसर का विश्लेषण करें →",
      demandHighlightsTitle: "स्थानीय बाजार मांग की मुख्य विशेषताएं",
      schemeHighlightsTitle: "सरकारी योजना की मुख्य विशेषताएं",
      viewCatchmentMap: "बाजार नक्शा खोलें →",
      exploreAllSchemes: "सभी योजनाएं देखें →",
      continueJourneyTitle: "अपनी यात्रा जारी रखें",
      continueJourneySubtitle: "अपनी पिछली प्रगति से आगे बढ़ें या नया विश्लेषण शुरू करें",
      activePlanTitle: "सक्रिय व्यापार योजना",
      resumePlanning: "वित्तीय योजना जारी रखें →",
      reviewAnalysis: "व्यापार विश्लेषण देखें →",
      viewDossier: "व्यापार डोजियर देखें →",
      incompleteDossierTitle: "अपना पंजीकरण डोजियर पूरा करें",
      incompleteDossierDesc: "आपकी प्रोफाइल में कुछ विवरण बाकी हैं। उच्चतम सब्सिडी पात्रता अनलॉक करने के लिए प्रोफाइल में AI वॉयस साक्षात्कार पूरा करें।",
      completeProfileCta: "AI साक्षात्कार में प्रोफाइल पूरा करें →",
      verifiedProfileTitle: "उद्यमी डोजियर सत्यापित",
      verifiedProfileDesc: "सभी आवश्यक प्रोफाइल विवरण सत्यापित हैं। आपकी व्यापार योजनाएं पूरी तरह से अनुकूलित हैं।",
      viewProfileDossier: "प्रोफाइल डोजियर देखें →",
      emptyPlansTitle: "अपना उद्यम शुरू करने के लिए तैयार हैं?",
      emptyPlansDesc: "आपने अभी तक कोई व्यक्तिगत योजना नहीं बनाई है। नए व्यावसायिक अवसर देखें या अपनी 5 वर्षीय वित्तीय योजना बनाएं।",
      exploreOppsCta: "व्यापार के नए अवसर देखें →"
    },
    te: {
      overviewTitle: "పారిశ్రామికవేత్త అవలోకనం",
      overviewSubtitle: "మీ గ్రామీణ వ్యాపారం కోసం నిజ-సమయ సంసిద్ధత కొలమానాలు",
      profileCompletion: "ప్రొఫైల్ పూర్తి",
      profileSubtext: `${totalCount} లో ${filledCount} వివరాలు ధృవీకరించబడ్డాయి`,
      completeProfileBtn: "AI ఇంటర్వ్యూలో ప్రొఫైల్ పూర్తి చేయండి →",
      verifiedDossier: "ధృవీకరించబడిన ప్రొఫైల్",
      savedPlans: "భద్రపరిచిన వ్యాపార ప్రణాళికలు",
      plansSubtext: personalPlans.length > 0 
        ? `${personalPlans.length} క్రియాశీల వ్యాపార ప్రణాళికలు` 
        : "4 ప్రాథమిక ప్రణాళికలు సిద్ధంగా ఉన్నాయి",
      viewPlansBtn: personalPlans.length > 0 ? "ప్రణాళికలు చూడండి →" : "అవకాశాలను అన్వేషించండి →",
      eligibleSchemes: "అర్హతగల ప్రభుత్వ పథకాలు",
      schemesSubtext: "PMEGP, NBCFDC, ముద్ర & పిఎం-విశ్వకర్మ",
      exploreSchemesBtn: "సబ్సిడీలను తనిఖీ చేయండి →",
      marketOpportunities: "స్థానిక మార్కెట్ అవకాశాలు",
      marketSubtext: `${locationDisplay}`,
      exploreMarketBtn: "మార్కెట్ మ్యాప్ చూడండి →",
      quickActionsEyebrow: "⚡ ముఖ్య విభాగాలు",
      quickActionsTitle: "త్వరిత చర్యలు (Quick Actions)",
      quickActionsSubtitle: "మీ వ్యాపారాన్ని విశ్లేషించడానికి, నిధులు పొందడానికి వేగవంతమైన ప్రవేశం",
      localHighlightsTitle: "స్థానిక అవకాశాల ముఖ్యాంశాలు",
      localHighlightsSubtitle: `${currentDistrict} కోసం అనుకూలీకరించిన వ్యాపార అవకాశాలు మరియు డిమాండ్ విశ్లేషణ`,
      changeLocation: "స్థానం మార్చండి",
      cancel: "రద్దు",
      save: "సేవ్ చేయండి",
      districtLabel: "జిల్లా / పట్టణం",
      stateLabel: "రాష్ట్రం",
      topViableOpps: "మీ పరిధిలోని ఉత్తమ వ్యాపార అవకాశాలు",
      analyzeOpportunity: "అవకాశాన్ని విశ్లేషించండి →",
      demandHighlightsTitle: "స్థానిక మార్కెట్ డిమాండ్ ముఖ్యాంశాలు",
      schemeHighlightsTitle: "ప్రభుత్వ పథకాల ముఖ్యాంశాలు",
      viewCatchmentMap: "మార్కెట్ మ్యాప్ తెరవండి →",
      exploreAllSchemes: "అన్ని పథకాలను చూడండి →",
      continueJourneyTitle: "మీ ప్రయాణాన్ని కొనసాగించండి",
      continueJourneySubtitle: "గతంలో ఆపిన చోటు నుండి పునఃప్రారంభించండి లేదా కొత్త ప్రాజెక్ట్ ప్రారంభించండి",
      activePlanTitle: "క్రియాశీల వ్యాపార ప్రణాళిక",
      resumePlanning: "ఆర్థిక ప్రణాళికను కొనసాగించండి →",
      reviewAnalysis: "వ్యాపార విశ్లేషణను చూడండి →",
      viewDossier: "వ్యాపార నివేదికను చూడండి →",
      incompleteDossierTitle: "మీ రిజిస్ట్రేషన్ ప్రొఫైల్ పూర్తి చేయండి",
      incompleteDossierDesc: "మీ ప్రొఫైల్‌లో కొన్ని ముఖ్య వివరాలు పెండింగ్‌లో ఉన్నాయి. గరిష్ట సబ్సిడీని పొందడానికి ప్రొఫైల్‌లోని AI వాయిస్ ఇంటర్వ్యూను పూర్తి చేయండి.",
      completeProfileCta: "AI ఇంటర్వ్యూలో ప్రొఫైల్ పూర్తి చేయండి →",
      verifiedProfileTitle: "ధృవీకరించబడిన ప్రొఫైల్",
      verifiedProfileDesc: "అన్ని వివరాలు ధృవీకరించబడ్డాయి. మీ వ్యాపార ప్రణాళికలు మరియు పథకాలు పూర్తిగా వ్యక్తిగతీకరించబడ్డాయి.",
      viewProfileDossier: "ప్రొఫైల్ చూడండి →",
      emptyPlansTitle: "మీ వ్యాపారాన్ని ప్రారంభించడానికి సిద్ధంగా ఉన్నారా?",
      emptyPlansDesc: "మీరు ఇంకా వ్యక్తిగత ప్రణాళికను సృష్టించలేదు. వ్యాపార అవకాశాలను అన్వేషించండి లేదా మీ 5 సంవత్సరాల ఆర్థిక ప్రణాళికను రూపొందించండి.",
      exploreOppsCta: "వ్యాపార అవకాశాలను అన్వేషించండి →"
    }
  };

  const l = labels[activeLang] || labels.en;

  // ----------------------------------------------------
  // SECTION C: QUICK ACTIONS CONFIGURATION
  // ----------------------------------------------------
  const quickActionCards = [
    {
      id: 'recommendations',
      title: activeLang === 'hi' ? 'व्यापार विश्लेषण' : (activeLang === 'te' ? 'వ్యాపార విశ్లేషణ' : 'Business Analysis'),
      desc: activeLang === 'hi' 
        ? 'लाभप्रदता, व्यवहार्यता और परियोजना लागत का विस्तृत मूल्यांकन करें।' 
        : (activeLang === 'te' 
          ? 'లాభదాయకత, సాధ్యాసాధ్యాలు మరియు ప్రాజెక్ట్ వ్యయాన్ని అంచనా వేయండి.' 
          : 'Evaluate viability, operating profit margins, and total capital requirements.'),
      badge: activeLang === 'hi' ? 'मुख्य विश्लेषण' : (activeLang === 'te' ? 'కోర్ విశ్లేషణ' : 'Core Analysis'),
      icon: BarChart3,
      accentBg: 'bg-emerald-500/10 text-[#0F3D2E]',
      borderHover: 'hover:border-[#0F3D2E]/40'
    },
    {
      id: 'market',
      title: activeLang === 'hi' ? 'स्थानीय बाजार अंतर्दृष्टि' : (activeLang === 'te' ? 'స్థానిక మార్కెట్ సమాచారం' : 'Local Market Insights'),
      desc: activeLang === 'hi' 
        ? 'अपने क्षेत्र में मांग-आपूर्ति अंतर और प्रतिस्पर्धियों का नक्शा देखें।' 
        : (activeLang === 'te' 
          ? 'మీ పరిధిలోని డిమాండ్, కొరత మరియు పోటీదారుల మ్యాప్‌ను పరిశీలించండి.' 
          : 'Inspect hyper-local demand, supply deficits, and competitors in your catchment.'),
      badge: activeLang === 'hi' ? 'स्थान आधारित' : (activeLang === 'te' ? 'స్థానిక మ్యాప్' : 'Location-Aware'),
      icon: MapPin,
      accentBg: 'bg-amber-500/10 text-[#C28A17]',
      borderHover: 'hover:border-[#C28A17]/40'
    },
    {
      id: 'finance',
      title: activeLang === 'hi' ? 'वित्तीय योजनाकार' : (activeLang === 'te' ? 'ఆర్థిక ప్రణాళిక' : 'Financial Planner'),
      desc: activeLang === 'hi' 
        ? 'मासिक ईएमआई, ऋण सेवा अनुपात (DSCR) और 5 साल का नकदी प्रवाह गणना करें।' 
        : (activeLang === 'te' 
          ? 'నెలవారీ EMI, DSCR కవరేజ్ మరియు 5 సంవత్సరాల నగదు ప్రవాహాలను లెక్కించండి.' 
          : 'Calculate debt serviceability (DSCR), monthly EMIs, and 5-year cashflows.'),
      badge: activeLang === 'hi' ? 'ऋण और ईएमआई' : (activeLang === 'te' ? 'రుణం & EMI' : 'Loan & EMI'),
      icon: Wallet,
      accentBg: 'bg-emerald-500/10 text-[#0F3D2E]',
      borderHover: 'hover:border-[#0F3D2E]/40'
    },
    {
      id: 'schemes',
      title: activeLang === 'hi' ? 'सरकारी योजनाएं' : (activeLang === 'te' ? 'ప్రభుత్వ పథకాలు' : 'Government Schemes'),
      desc: activeLang === 'hi' 
        ? 'PMEGP, NBCFDC, और मुद्रा योजनाओं से 35% तक पूंजीगत सब्सिडी प्राप्त करें।' 
        : (activeLang === 'te' 
          ? 'PMEGP, NBCFDC, మరియు ముద్ర ద్వారా 35% వరకు సబ్సిడీని పొందండి.' 
          : 'Find MoSJE, PMEGP, Mudra subsidies, margin money, and interest subventions.'),
      badge: activeLang === 'hi' ? 'सब्सिडी' : (activeLang === 'te' ? 'రాయితీలు' : 'Subsidies'),
      icon: Landmark,
      accentBg: 'bg-amber-500/10 text-[#C28A17]',
      borderHover: 'hover:border-[#C28A17]/40'
    },
    {
      id: 'risk',
      title: activeLang === 'hi' ? 'जोखिम और तनाव परीक्षण' : (activeLang === 'te' ? 'రిస్క్ & ఒత్తిడి పరీక్ష' : 'Risk & Stress'),
      desc: activeLang === 'hi' 
        ? 'महंगाई, फसल विफलता और राजस्व गिरावट के खिलाफ व्यापार लचीलापन जांचें।' 
        : (activeLang === 'te' 
          ? 'ద్రవ్యోల్బణం మరియు అమ్మకాల తగ్గుదలను ఎదుర్కొనే వ్యాపార శక్తిని పరీక్షించండి.' 
          : 'Stress-test enterprise cashflow against inflation, price shocks, and revenue drops.'),
      badge: activeLang === 'hi' ? 'लचीलापन' : (activeLang === 'te' ? 'స్థిరత్వం' : 'Resilience'),
      icon: ShieldAlert,
      accentBg: 'bg-emerald-500/10 text-[#0F3D2E]',
      borderHover: 'hover:border-[#0F3D2E]/40'
    },
    {
      id: 'simulator',
      title: activeLang === 'hi' ? 'सिम्युलेटर / क्या-अगर' : (activeLang === 'te' ? 'సిమ్యులేటర్ / వాట్-ఇఫ్' : 'Simulator / What-If'),
      desc: activeLang === 'hi' 
        ? 'पूंजी, उत्पादन मात्रा और बिक्री मूल्य को वास्तविक समय में बदलकर परिणाम देखें।' 
        : (activeLang === 'te' 
          ? 'పెట్టుబడి, అమ్మకాల పరిమాణం మరియు ధరలను మార్చి ప్రత్యక్ష ఫలితాలు చూడండి.' 
          : 'Adjust project capital, sales volumes, and unit pricing in real time.'),
      badge: activeLang === 'hi' ? 'इंटरैक्टिव' : (activeLang === 'te' ? 'ఇంటరాక్టివ్' : 'Interactive'),
      icon: Sliders,
      accentBg: 'bg-amber-500/10 text-[#C28A17]',
      borderHover: 'hover:border-[#C28A17]/40'
    }
  ];

  return (
    <div className="space-y-10 pb-12">

      {/* ==================================================== */}
      {/* SECTION A – WELCOME BANNER                           */}
      {/* ==================================================== */}
      <HeroBanner
        userName={userName}
        onExploreOpportunities={() => setActiveTab('recommendations')}
        onStartAnalysis={() => setActiveTab('recommendations')}
        onCompleteProfile={() => setActiveTab('profile')}
        profileCompletion={profileCompletion}
        language={language}
        lang={language}
      />

      {/* ==================================================== */}
      {/* SECTION B – ENTREPRENEUR OVERVIEW                    */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <div>
            <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
              {l.overviewTitle}
            </h2>
            <p className="text-xs text-stone-500">
              {l.overviewSubtitle}
            </p>
          </div>
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-100 text-[#0F3D2E] w-fit">
            📍 {locationDisplay}
          </span>
        </div>

        {/* 4 Compact Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Business Profile Completion */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {l.profileCompletion}
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-[#0F3D2E]">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-[#0F3D2E]">
                  {profileCompletion}%
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  {profileCompletion === 100 ? 'Complete' : 'Ready'}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-stone-100 h-2 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#0F3D2E] to-[#C28A17] h-full rounded-full transition-all duration-500"
                  style={{ width: `${profileCompletion}%` }}
                />
              </div>

              <p className="text-[11px] text-stone-500 mt-2">
                {l.profileSubtext}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100">
              {profileCompletion < 100 ? (
                <button
                  onClick={() => setActiveTab('profile')}
                  className="text-xs font-bold text-[#C28A17] hover:text-[#b07d14] flex items-center space-x-1 group"
                >
                  <span>{l.completeProfileBtn}</span>
                </button>
              ) : (
                <div className="flex items-center space-x-1 text-emerald-700 text-xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{l.verifiedDossier}</span>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Saved Business Plans */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {l.savedPlans}
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-[#C28A17]">
                  <FileText className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-stone-900">
                  {personalPlans.length}
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  {personalPlans.length === 1 ? 'Personal Plan' : 'Personal Plans'}
                </span>
              </div>

              <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                {l.plansSubtext}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100">
              <button
                onClick={() => setActiveTab(personalPlans.length > 0 ? 'report' : 'recommendations')}
                className="text-xs font-bold text-[#0F3D2E] hover:text-[#165440] flex items-center space-x-1"
              >
                <span>{l.viewPlansBtn}</span>
              </button>
            </div>
          </div>

          {/* Card 3: Eligible Government Schemes */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {l.eligibleSchemes}
                </span>
                <div className="p-2 rounded-xl bg-emerald-50 text-[#0F3D2E]">
                  <Landmark className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-[#0F3D2E]">
                  4
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  Schemes Matched
                </span>
              </div>

              <p className="text-[11px] text-stone-500 mt-2 leading-relaxed">
                {l.schemesSubtext}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100">
              <button
                onClick={() => setActiveTab('schemes')}
                className="text-xs font-bold text-[#C28A17] hover:text-[#b07d14] flex items-center space-x-1"
              >
                <span>{l.exploreSchemesBtn}</span>
              </button>
            </div>
          </div>

          {/* Card 4: Local Market Opportunities */}
          <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {l.marketOpportunities}
                </span>
                <div className="p-2 rounded-xl bg-amber-50 text-[#C28A17]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-stone-900">
                  4
                </span>
                <span className="text-xs font-semibold text-stone-500">
                  High-Demand Sectors
                </span>
              </div>

              <p className="text-[11px] text-stone-500 mt-2 leading-relaxed truncate">
                {l.marketSubtext}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100">
              <button
                onClick={() => setActiveTab('market')}
                className="text-xs font-bold text-[#0F3D2E] hover:text-[#165440] flex items-center space-x-1"
              >
                <span>{l.exploreMarketBtn}</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION C – QUICK ACTIONS                            */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider text-[#C28A17] uppercase">
            {l.quickActionsEyebrow}
          </span>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            {l.quickActionsTitle}
          </h2>
          <p className="text-xs text-stone-500">
            {l.quickActionsSubtitle}
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {quickActionCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.id}
                onClick={() => setActiveTab(card.id)}
                className={`group bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm ${card.borderHover} hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-2xl ${card.accentBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                      {card.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 group-hover:text-[#0F3D2E] transition-colors">
                    {card.title}
                  </h3>

                  <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-[#0F3D2E] group-hover:text-[#C28A17] transition-colors">
                  <span>
                    {activeLang === 'hi' ? 'खोलें' : (activeLang === 'te' ? 'తెరవండి' : 'Open Module')}
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ==================================================== */}
      {/* SECTION D – LOCAL OPPORTUNITY HIGHLIGHTS              */}
      {/* ==================================================== */}
      <section className="space-y-5">
        
        {/* Section Header with Location Controls */}
        <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Compass className="w-5 h-5 text-[#C28A17]" />
              <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
                {l.localHighlightsTitle}
              </h2>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              {l.localHighlightsSubtitle}
            </p>
          </div>

          {/* Location Badge & Edit Button */}
          {!isEditingLocation ? (
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl bg-emerald-50 text-[#0F3D2E] border border-emerald-100 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5 text-[#C28A17]" />
                <span>{locationDisplay}</span>
              </div>
              <button
                onClick={() => setIsEditingLocation(true)}
                className="py-1.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition flex items-center space-x-1"
              >
                <Edit2 className="w-3 h-3 text-stone-500" />
                <span>{l.changeLocation}</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSaveLocation} className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={inputDistrict}
                onChange={(e) => setInputDistrict(e.target.value)}
                placeholder="District"
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#0F3D2E] w-32"
              />
              <input
                type="text"
                value={inputState}
                onChange={(e) => setInputState(e.target.value)}
                placeholder="State"
                className="bg-stone-50 border border-stone-200 rounded-xl px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-[#0F3D2E] w-36"
              />
              <button
                type="submit"
                className="py-1.5 px-3 rounded-xl bg-[#0F3D2E] text-white text-xs font-bold hover:bg-[#165440]"
              >
                {l.save}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingLocation(false)}
                className="py-1.5 px-3 rounded-xl bg-stone-100 text-stone-600 text-xs font-bold hover:bg-stone-200"
              >
                {l.cancel}
              </button>
            </form>
          )}
        </div>

        {/* Content Layout: Opportunities Grid + Side Highlights */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8 cols): Top Opportunities in Catchment */}
          <div className="lg:col-span-8 space-y-4">
            <h3 className="text-sm font-bold text-stone-700 uppercase tracking-wider">
              {l.topViableOpps}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {displayedOpportunities.map((plan) => {
                const isSelected = activePlan?.id === plan.id;
                const cost = plan.financials?.project_cost || plan.requiredInvestment || plan.capital || 300000;
                const revenue = plan.financials?.projected_monthly_revenue || 50000;
                const score = plan.suitabilityScore || plan.rawRecommendation?.overall_suitability_score || 90;

                const planName = activeLang === 'hi' && plan.rawRecommendation?.name_hi
                  ? plan.rawRecommendation.name_hi
                  : (activeLang === 'te' && plan.rawRecommendation?.name_te
                    ? plan.rawRecommendation.name_te
                    : plan.businessName);

                const planDesc = activeLang === 'hi' && plan.description_hi
                  ? plan.description_hi
                  : (activeLang === 'te' && plan.description_te
                    ? plan.description_te
                    : plan.description);

                return (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#C28A17] ring-2 ring-[#C28A17]/20 shadow-md'
                        : 'border-emerald-900/10 hover:border-emerald-900/30 hover:shadow-md'
                    }`}
                  >
                    <div>
                      {/* Top Row: Category + Score */}
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#0F3D2E] uppercase">
                          {plan.category?.replace(/_/g, ' ') || 'MICRO_ENTERPRISE'}
                        </span>
                        <span className="text-xs font-black text-[#C28A17] bg-amber-50 px-2 py-0.5 rounded-full">
                          {typeof score === 'number' ? score.toFixed(1) : score}% Viability
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-stone-900 line-clamp-1">
                        {planName}
                      </h4>

                      <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                        {planDesc}
                      </p>

                      {/* Key Financial Badges */}
                      <div className="grid grid-cols-2 gap-2 mt-4 p-3 rounded-2xl bg-stone-50 border border-stone-100">
                        <div>
                          <p className="text-[10px] text-stone-400 font-semibold uppercase">Project Cost</p>
                          <p className="text-xs font-black text-stone-900">₹{(cost).toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-stone-400 font-semibold uppercase">Monthly Rev.</p>
                          <p className="text-xs font-black text-[#0F3D2E]">₹{(revenue).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4 pt-3 border-t border-stone-100">
                      <button
                        onClick={() => {
                          if (setActivePlanId) setActivePlanId(plan.id);
                          setActiveTab('recommendations');
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-[#0F3D2E] hover:bg-[#165440] text-white text-xs font-bold text-center transition flex items-center justify-center space-x-1"
                      >
                        <span>{l.analyzeOpportunity}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column (4 cols): Demand & Schemes Highlights */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Local Demand Card */}
            <div className="bg-gradient-to-br from-[#0F3D2E] to-[#144d3b] text-white rounded-3xl p-5 shadow-lg border border-emerald-800/40">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                  🌱 HYPER-LOCAL DEMAND
                </span>
                <span className="text-[11px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold">
                  {currentDistrict}
                </span>
              </div>

              <h4 className="text-sm font-extrabold text-amber-100 mb-3">
                {l.demandHighlightsTitle}
              </h4>

              <div className="space-y-2.5 text-xs">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="font-bold text-amber-300">🚜 Farm Mechanization Deficit</p>
                  <p className="text-[11px] text-emerald-100 mt-0.5">High demand for custom hiring rotavators and harvesters in harvest season.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="font-bold text-amber-300">🥛 Dairy & Cold Storage</p>
                  <p className="text-[11px] text-emerald-100 mt-0.5">Continuous daily liquid cash flow with cooperative milk collection tie-ups.</p>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                  <p className="font-bold text-amber-300">🍄 Protected Cultivation</p>
                  <p className="text-[11px] text-emerald-100 mt-0.5">Strong urban hotel demand with low land requirement (0.1 acre indoor space).</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('market')}
                className="w-full mt-4 py-2.5 rounded-2xl bg-[#C28A17] hover:bg-[#b07d14] text-white text-xs font-bold text-center transition flex items-center justify-center space-x-1 shadow-md"
              >
                <span>{l.viewCatchmentMap}</span>
              </button>
            </div>

            {/* Scheme Highlights Card */}
            <div className="bg-white rounded-3xl p-5 border border-emerald-900/10 shadow-sm">
              <div className="flex items-center space-x-2 mb-3">
                <Landmark className="w-4 h-4 text-[#C28A17]" />
                <h4 className="text-sm font-extrabold text-stone-900">
                  {l.schemeHighlightsTitle}
                </h4>
              </div>

              <div className="space-y-2.5 text-xs text-stone-600">
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <p className="font-bold text-[#0F3D2E]">PMEGP Subsidy</p>
                  <p className="text-[11px] text-stone-500">25% to 35% government capital subsidy on eligible project cost.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <p className="font-bold text-[#0F3D2E]">NBCFDC Term Loan</p>
                  <p className="text-[11px] text-stone-500">8% concessional interest rate with up to 6 months moratorium period.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-100">
                  <p className="font-bold text-[#0F3D2E]">PM Mudra Yojana</p>
                  <p className="text-[11px] text-stone-500">Collateral-free micro loans up to ₹10 Lakhs for rural micro-enterprises.</p>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('schemes')}
                className="w-full mt-4 py-2 rounded-xl bg-emerald-50 text-[#0F3D2E] hover:bg-emerald-100 text-xs font-bold text-center transition flex items-center justify-center space-x-1"
              >
                <span>{l.exploreAllSchemes}</span>
              </button>
            </div>

          </div>

        </div>

      </section>

      {/* ==================================================== */}
      {/* SECTION E – CONTINUE YOUR JOURNEY                    */}
      {/* ==================================================== */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-extrabold text-stone-900 tracking-tight">
            {l.continueJourneyTitle}
          </h2>
          <p className="text-xs text-stone-500">
            {l.continueJourneySubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          
          {/* Card 1: Active Business Plan / Recent Analysis */}
          {activePlan ? (
            <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="p-2 rounded-xl bg-amber-500/15 text-[#C28A17]">
                      <Compass className="w-4 h-4" />
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      {l.activePlanTitle}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#0F3D2E]">
                    {activePlan.category?.replace(/_/g, ' ') || 'SELECTED'}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-stone-900">
                  {activePlan.businessName}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                  {activePlan.description}
                </p>

                {/* Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 mt-4 p-3 rounded-2xl bg-stone-50 border border-stone-100 text-center">
                  <div>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase">Project Cost</p>
                    <p className="text-xs font-black text-stone-900">
                      ₹{((activePlan.financials?.project_cost || activePlan.requiredInvestment || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase">Monthly Net</p>
                    <p className="text-xs font-black text-[#0F3D2E]">
                      ₹{((activePlan.financials?.monthly_net_surplus_after_emi || 0)).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase">DSCR Ratio</p>
                    <p className="text-xs font-black text-[#C28A17]">
                      {activePlan.financials?.dscr || '2.15'}x
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-4 border-t border-stone-100 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTab('finance')}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#0F3D2E] hover:bg-[#165440] text-white text-xs font-bold text-center transition shadow-xs"
                >
                  {l.resumePlanning}
                </button>
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className="py-2 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition"
                >
                  {l.reviewAnalysis}
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-[#C28A17] text-xs font-bold transition"
                >
                  {l.viewDossier}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm flex flex-col justify-between">
              <div>
                <div className="p-3 rounded-2xl bg-amber-50 text-[#C28A17] w-fit mb-3">
                  <Compass className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-stone-900">
                  {l.emptyPlansTitle}
                </h3>
                <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                  {l.emptyPlansDesc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100">
                <button
                  onClick={() => setActiveTab('recommendations')}
                  className="py-2.5 px-4 rounded-xl bg-[#0F3D2E] text-white text-xs font-bold hover:bg-[#165440] transition"
                >
                  {l.exploreOppsCta}
                </button>
              </div>
            </div>
          )}

          {/* Card 2: Profile / Registration Dossier Status */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-900/10 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <span className={`p-2 rounded-xl ${profileCompletion < 100 ? 'bg-amber-500/15 text-[#C28A17]' : 'bg-emerald-50 text-[#0F3D2E]'}`}>
                    {profileCompletion < 100 ? <AlertCircle className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Registration Dossier
                  </span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profileCompletion < 100 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-[#0F3D2E]'}`}>
                  {profileCompletion}% Complete
                </span>
              </div>

              <h3 className="text-base font-extrabold text-stone-900">
                {profileCompletion < 100 ? l.incompleteDossierTitle : l.verifiedProfileTitle}
              </h3>
              <p className="text-xs text-stone-500 mt-2 leading-relaxed">
                {profileCompletion < 100 ? l.incompleteDossierDesc : l.verifiedProfileDesc}
              </p>

              {/* Checklist preview */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                {profileChecks.slice(0, 4).map((check, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5 text-[11px] text-stone-600">
                    {check.filled ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-stone-300 shrink-0" />
                    )}
                    <span className={check.filled ? 'font-medium' : 'text-stone-400'}>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-stone-100">
              <button
                onClick={() => setActiveTab('profile')}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  profileCompletion < 100
                    ? 'bg-[#C28A17] hover:bg-[#b07d14] text-white shadow-md'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                }`}
              >
                <span>{profileCompletion < 100 ? l.completeProfileCta : l.viewProfileDossier}</span>
              </button>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================== */}
      {/* LOWER CONTENT: Why UdyamSaarthi & Core Guidance      */}
      {/* ==================================================== */}
      <LowerDashboard language={language} lang={language} />

    </div>
  );
}
