// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const   ERC20Module = buildModule("ERC20Module", (m) => {
 
  const erc20 = m.contract("ERC20");

  return {erc20 };
});

export default ERC20Module;
