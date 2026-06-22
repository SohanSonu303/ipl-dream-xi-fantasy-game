import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BackgroundFX } from '@/components/Shared/BackgroundFX';
import { HomePage } from '@/pages/Home/HomePage';
import { DraftPage } from '@/pages/Draft/DraftPage';
import { PreDraftPage } from '@/pages/Draft/PreDraftPage';
import { SimulationPage } from '@/pages/Simulation/SimulationPage';
import { ResultsPage } from '@/pages/Results/ResultsPage';
import { VersusPage } from '@/pages/Versus/VersusPage';
import { VersusResultPage } from '@/pages/Versus/VersusResultPage';
import { CollectionPage } from '@/pages/Collection/CollectionPage';
import { BuildChallengePage } from '@/pages/Collection/BuildChallengePage';
import { AuctionPage } from '@/pages/Auction/AuctionPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/pre-draft" element={<PreDraftPage />} />
        <Route path="/draft" element={<DraftPage />} />
        <Route path="/auction" element={<AuctionPage />} />
        <Route path="/collection" element={<CollectionPage />} />
        <Route path="/build-challenge" element={<BuildChallengePage />} />
        <Route path="/simulate" element={<SimulationPage />} />
        <Route path="/results" element={<ResultsPage />} />
        <Route path="/vs/:code" element={<VersusPage />} />
        <Route path="/versus-result" element={<VersusResultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <BackgroundFX />
        <div className="relative min-h-dvh">
          <AnimatedRoutes />
        </div>
      </HashRouter>
    </QueryClientProvider>
  );
}
