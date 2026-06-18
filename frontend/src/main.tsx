import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { useAuthStore } from './store/auth.store';
import './index.css';

// Hydrate auth state from localStorage before the first render.
useAuthStore.getState().initAuth();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { borderRadius: '0.5rem', fontSize: '0.875rem' },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
);
