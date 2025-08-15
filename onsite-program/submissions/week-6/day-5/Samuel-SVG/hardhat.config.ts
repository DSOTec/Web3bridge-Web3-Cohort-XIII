import { HardhatUserConfig } from "hardhat/types";
import { vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const SEPOLIA_URL = vars.get("SEPOLIA_URL_KEY");
const PRIVATE_KEY = vars.get("PRIVATE_KEY");
const ETHERSCAN_API_KEY = vars.get("ETHERSCAN_API_KEY");

const config: HardhatUserConfig = {
    solidity: "0.8.28",
    networks: {
        sepolia: {
            url: SEPOLIA_URL,
            accounts: [PRIVATE_KEY],
        },
    },
    etherscan: {
        apiKey: {
            sepolia: ETHERSCAN_API_KEY,
        },
    },
};

export default config;