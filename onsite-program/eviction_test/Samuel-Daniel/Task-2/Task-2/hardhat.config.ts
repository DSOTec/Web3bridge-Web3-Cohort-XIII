import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { vars } from "hardhat/config";

// Use a reliable default RPC URL if not set
const ETHEREUM_RPC_URL = vars.get("ETHEREUM_RPC_URL", "https://eth.llamarpc.com");

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: {
        url: ETHEREUM_RPC_URL,
        // Remove blockNumber to use latest block for current gas prices
      },
      chainId: 1,
      accounts: {
        count: 20,
        accountsBalance: "10000000000000000000000", // 10,000 ETH per account
      },
      // Configure gas settings for current mainnet conditions
      gasPrice: "auto",
      gas: "auto",
    },
    mainnet: {
      url: ETHEREUM_RPC_URL,
      chainId: 1,
    },
  },
  mocha: {
    timeout: 60000, // 60 seconds timeout for tests
  },
};

export default config;
