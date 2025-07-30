// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const SchoolMSModule = buildModule("SchoolMSModule", (m) => {
 
  const schoolms = m.contract("SchoolMS");

  return { schoolms};
});

export default SchoolMSModule;
