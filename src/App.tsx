import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BackgroundFX } from '@/components/Shared/BackgroundFX';
import { HomePage } from '@/pages/Home/HomePage';
import { DraftPage } from '@/pages/Draft/DraftPage';
import { SimulationPage } from '@/pages/Simulation/SimulationPage';
import { ResultsPage } from '@/pages/Results/ResultsPage';
import { VersusPage } from '@/pages/Versus/VersusPage';
import { VersusResultPage } from '@/pages/Versus/VersusResultPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/draft" element={<DraftPage />} />
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
