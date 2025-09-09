import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { config, chains } from './config/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import './index.css';
import App from './App';

// Create a client
const queryClient = new QueryClient();

// Error boundary component
function ErrorBoundary({ children }) {
  try {
    return children;
  } catch (error) {
    console.error('Web3 Provider Error:', error);
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Web3 Configuration Error</h2>
        <p>Please check the console for details.</p>
        <p>{error.message}</p>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider chains={chains}>
            <App />
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  </StrictMode>
);
