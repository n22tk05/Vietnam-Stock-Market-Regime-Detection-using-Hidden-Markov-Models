import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { HeroSection } from './sections/HeroSection';
import { ProblemsSection } from './sections/ProblemsSection';
import { HowItWorksSection } from './sections/HowItWorksSection';
import { ForecastDemoSection } from './sections/ForecastDemoSection';
import { TrustBannerSection } from './sections/TrustBannerSection';
import { FinalCtaBanner } from './sections/FinalCtaBanner';
import { AssessmentModal } from '../assessment/AssessmentModal';

export const LandingPage: React.FC = () => {
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);

  const openAssessment = () => setIsAssessmentOpen(true);
  const closeAssessment = () => setIsAssessmentOpen(false);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Header onOpenAssessment={openAssessment} />

      <main className="flex-1">
        <HeroSection onOpenAssessment={openAssessment} />
        <ProblemsSection />
        <HowItWorksSection />
        <ForecastDemoSection />
        <TrustBannerSection />
        <FinalCtaBanner />
      </main>

      <Footer />

      <AssessmentModal isOpen={isAssessmentOpen} onClose={closeAssessment} />
    </div>
  );
};

export default LandingPage;
