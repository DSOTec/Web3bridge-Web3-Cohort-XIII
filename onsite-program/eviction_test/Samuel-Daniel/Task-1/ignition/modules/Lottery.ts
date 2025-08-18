// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LotteryModule = buildModule("LotteryModule", (m) => {
  // Deploy the Lottery contract
  // No constructor parameters needed as the contract uses constants
  const lottery = m.contract("Lottery", []);

  return { lottery };
});

export default LotteryModule;
