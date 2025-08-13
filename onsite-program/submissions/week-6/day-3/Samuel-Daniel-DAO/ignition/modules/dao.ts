// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";



const Dao = buildModule("Dao", (m) => {
  const dao = m.contract("Dao");
  return { dao };
});

export default Dao;
