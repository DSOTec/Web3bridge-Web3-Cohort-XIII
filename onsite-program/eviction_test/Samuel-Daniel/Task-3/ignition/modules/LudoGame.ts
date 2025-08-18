import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LudoGameModule = buildModule("LudoGameModule", (m) => {
  const ludoGame = m.contract("LudoGame");

  return { ludoGame };
});

export default LudoGameModule;
