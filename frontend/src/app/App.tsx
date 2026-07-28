import { useState } from 'react';
import { Footer, Header } from '@/components/layout';
import { AssessmentModal } from '@/features/assessment';

import { LandingPage } from '@/features/landing';
import { LiveDemoPage } from '@/features/live-demo';
import { PublicPortfolioPage } from '@/features/public-portfolio';
import { Routes, Route, useNavigate } from 'react-router-dom';

export function App() {
  const [isAssessmentOpen, setIsAssessmentOpen] = useState(false);

  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      <Routes>
        <Route path="/" element={
          <>
            <Header
              onOpenAssessment={() => setIsAssessmentOpen(true)}
              onOpenLiveDemo={() => navigate('/live-demo')}
              onOpenPortfolio={() => navigate('/portfolio')}
            />

            <LandingPage
              onOpenAssessment={() => setIsAssessmentOpen(true)}
              onOpenLiveDemo={() => navigate('/live-demo')}
            />

            <Footer />

            <AssessmentModal
              isOpen={isAssessmentOpen}
              onClose={() => setIsAssessmentOpen(false)}
            />
          
          </>
        } />
        
        <Route path="/live-demo" element={<LiveDemoPage />} />
        <Route path="/portfolio" element={<PublicPortfolioPage />} />
      </Routes>
    </div>
  );
}

export default App;
