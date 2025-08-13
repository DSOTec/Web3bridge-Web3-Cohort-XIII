import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from 'dotenv';

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";

if (!PRIVATE_KEY) {
  console.warn("Please set your PRIVATE_KEY in a .env file");
}

const config: HardhatUserConfig = {
    solidity: "0.8.20",
    networks: {
        liskTestnet: {
            url: "https://rpc.sepolia-api.lisk.com",
            chainId: 4202,
            accounts: [PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: {
            "lisk-sepolia": "123",
        },
        customChains: [
            {
                network: "lisk-sepolia",
                chainId: 4202,
                urls: {
                    apiURL: "https://sepolia-blockscout.lisk.com/api",
                    browserURL: "https://sepolia-blockscout.lisk.com",
                },
            },
        ],
    },
    sourcify: {
        enabled: false,
    },
};

export default config;