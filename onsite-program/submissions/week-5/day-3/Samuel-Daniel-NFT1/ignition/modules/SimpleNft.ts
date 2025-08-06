// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";



const SimpleNftModule = buildModule("SimpleNftModule", (m) => {
  
  const simplenft = m.contract("SimpleNft");

  return { simplenft };
});

export default SimpleNftModule;
