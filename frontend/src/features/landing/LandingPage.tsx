import {
  DashboardPreviewSection,
  FinalCtaBanner,
  FullExperienceSection,
  HeroSection,
  HowItWorksSection,
  InvestorProblemsSection,
  PartnerMarquee,
  TrustBannerSection,
} from '@/features/landing/sections';

interface LandingPageProps {
  onOpenAssessment: () => void;
  onOpenLiveDemo: () => void;
}

export function LandingPage({
  onOpenAssessment,
  onOpenLiveDemo,
}: LandingPageProps) {
  return (
    <main className="grow">
      <HeroSection
        onOpenAssessment={onOpenAssessment}
        onOpenLiveDemo={onOpenLiveDemo}
      />
      <PartnerMarquee />
      <InvestorProblemsSection />
      <HowItWorksSection />
      <FullExperienceSection onOpenAssessment={onOpenAssessment} />
      <DashboardPreviewSection />
      <TrustBannerSection />
      <FinalCtaBanner onOpenAssessment={onOpenAssessment} />
    </main>
  );
}
