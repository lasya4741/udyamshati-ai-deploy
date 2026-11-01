import React from 'react';
import { ArrowRight, Sprout } from 'lucide-react';
import heroImg from '../../assets/rural_entrepreneur_hero.jpg';
import { translations } from '../../locales/translations';

export default function HeroBanner({ 
  userName, 
  onStartAnalysis, 
  onExploreOpportunities, 
  onCompleteProfile,
  profileCompletion,
  language = 'en', 
  lang 
}) {
  const activeLang = language || lang || 'en';
  const t = translations[activeLang] || translations.en;

  const handlePrimaryClick = onExploreOpportunities || onStartAnalysis;

  // Get time-based greeting key
  const getGreetingText = () => {
    const hour = new Date().getHours();
    if (activeLang === 'hi') {
      if (hour < 12) return 'शुभ प्रभात';
      if (hour < 17) return 'शुभ दोपहर';
      return 'शुभ संध्या';
    }
    if (activeLang === 'te') {
      if (hour < 12) return 'శుభోదయం';
      if (hour < 17) return 'శుభ మధ్యాహ్నం';
      return 'శుభ సాయంత్రం';
    }
    if (hour < 12) return t.goodMorning || 'Good morning';
    if (hour < 17) return t.goodAfternoon || 'Good afternoon';
    return t.goodEvening || 'Good evening';
  };

  const firstName = userName ? userName.split(' ')[0] : (activeLang === 'hi' ? 'उद्यमी' : (activeLang === 'te' ? 'పారిశ్రామికవేత్త' : 'Entrepreneur'));

  const motivationalMessage = activeLang === 'hi'
    ? 'स्थानीय बाजार अंतर्दृष्टि, बैंक योग्य वित्तीय योजना और सरकारी सब्सिडी के साथ अपने ग्रामीण उद्यम को सफल बनाएं।'
    : (activeLang === 'te'
      ? 'స్థానిక మార్కెట్ విశ్లేషణ, బ్యాంక్ ప్రాజెక్ట్ ప్లాన్ మరియు ప్రభుత్వ సబ్సిడీలతో మీ గ్రామీణ వ్యాపారాన్ని ప్రారంభించండి.'
      : 'Empowering your rural enterprise with hyper-local market intelligence, bankable financial plans, and government credit subsidies.');

  const exploreBtnText = activeLang === 'hi'
    ? 'व्यापार के नए अवसर देखें'
    : (activeLang === 'te'
      ? 'వ్యాపార అవకాశాలను అన్వేషించండి'
      : 'Explore Business Opportunities');

  const completeProfileBtnText = activeLang === 'hi'
    ? 'AI साक्षात्कार में प्रोफाइल पूरा करें'
    : (activeLang === 'te'
      ? 'AI ఇంటర్వ్యూతో ప్రొఫైల్ పూర్తి చేయండి'
      : 'Complete Profile in AI Interviewer');

  return (
    <div className="relative w-full rounded-3xl overflow-hidden bg-[#0F3D2E] text-white shadow-xl border border-emerald-800/40">
      
      {/* Background Image Layer with Right-Side Positioning */}
      <div 
        className="absolute inset-0 bg-cover bg-right sm:bg-right-top opacity-35 sm:opacity-45 mix-blend-luminosity transform scale-105"
        style={{ backgroundImage: `url(${heroImg})` }}
      />

      {/* Text-Safe Gradient Overlay (Left to Right) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0F3D2E] via-[#0F3D2E]/95 to-transparent sm:w-3/4" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0F3D2E]/80 via-transparent to-transparent" />

      {/* Content Container */}
      <div className="relative z-10 p-6 sm:p-10 max-w-2xl flex flex-col justify-between min-h-[240px] sm:min-h-[270px]">
        
        {/* Top Tag */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-400/20 backdrop-blur-md border border-amber-400/30 text-amber-300 text-xs font-semibold w-fit mb-3">
          <Sprout className="w-3.5 h-3.5 text-amber-300" />
          <span>{t.bharatMission || t.missionBadge || 'Bharat Rural Enterprise Mission • MoSJE'}</span>
        </div>

        {/* Greeting & Headline */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-amber-100 tracking-tight leading-tight">
            {getGreetingText()}, <span className="text-amber-400">{firstName}</span>! ☀️
          </h1>
          <p className="text-lg sm:text-xl font-bold text-white mt-1 leading-snug">
            {t.heroBannerHeadline || t.heroHeadline || 'Your ideas can create a stronger tomorrow.'}
          </p>
          <p className="text-xs sm:text-sm text-stone-200 mt-2 font-normal leading-relaxed max-w-lg">
            {motivationalMessage}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={handlePrimaryClick}
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-2xl bg-[#C28A17] hover:bg-[#b07d14] text-white font-bold text-sm shadow-lg shadow-amber-900/30 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
          >
            <span>{exploreBtnText}</span>
            <ArrowRight className="w-4 h-4 text-white" />
          </button>

          {onCompleteProfile && profileCompletion !== undefined && profileCompletion < 100 && (
            <button
              onClick={onCompleteProfile}
              className="inline-flex items-center space-x-1.5 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-amber-200 border border-amber-300/30 font-semibold text-xs backdrop-blur-md transition-all duration-200"
            >
              <span>{completeProfileBtnText}</span>
              <span className="text-amber-400 font-bold">({profileCompletion}%)</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
