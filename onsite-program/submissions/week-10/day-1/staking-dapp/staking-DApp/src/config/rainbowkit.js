import { http, createConfig } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { getDefaultConfig, getDefaultWallets } from '@rainbow-me/rainbowkit';

// Get the contract address from environment variables
const CONTRACT_ADDRESS = import.meta.env.VITE_STAKING_CONTRACT_ADDRESS || '0xYourDefaultContractAddress';

// Configure chains for the dApp
export const chains = [sepolia]; // Using Sepolia testnet as default

// Use a specific project ID or a test one if not provided
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '21fef68091cd2c915db111cadddfdcce';

// Set up wallet connectors
export const { connectors } = getDefaultWallets({
  appName: 'Staking dApp',
  projectId,
  chains,
});

// Create wagmi config
export const config = createConfig({
  chains,
  transports: {
    [sepolia.id]: http(import.meta.env.VITE_RPC_URL || 'https://rpc.sepolia.org'),
  },
  ssr: true,
});

// Export contract address
export { CONTRACT_ADDRESS };
