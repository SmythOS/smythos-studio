// src/webapp/index.js
import { OnboardingProvider } from '@src/react/features/agents/contexts/OnboardingContext';
import { TooltipProvider } from '@src/react/shared/components/ui/tooltip';
import { SidebarProvider } from '@src/react/shared/contexts/SidebarContext';
import { queryClient } from '@src/react/shared/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { routeMap } from './routeMap';
import RoutesWrapper from './routes';

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <TooltipProvider delayDuration={300} skipDelayDuration={100}>
          <SidebarProvider>
            <OnboardingProvider>
              <RoutesWrapper pages={routeMap} />
            </OnboardingProvider>
          </SidebarProvider>
        </TooltipProvider>
      </Router>
    </QueryClientProvider>
  );
};

export default App;
