// src/webapp/index.js
import { OnboardingProvider } from '@src/react/features/agents/contexts/OnboardingContext';
import { SidebarProvider } from '@src/react/shared/contexts/SidebarContext';
import { queryClient } from '@src/react/shared/query-client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { routeMap } from './routeMap';
import RoutesWrapper from './routes';

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <SidebarProvider>
          <OnboardingProvider>
            <RoutesWrapper pages={routeMap} />
          </OnboardingProvider>
        </SidebarProvider>
      </Router>
      <ToastContainer />
    </QueryClientProvider>
  );
};

export default App;
