import { ethers } from "hardhat";

async function main() {
  console.log("Deploying Lottery contract...");

  const Lottery = await ethers.getContractFactory("Lottery");

  const lottery = await Lottery.deploy();

  await lottery.waitForDeployment();

  const lotteryAddress = await lottery.getAddress();

  console.log(`Lottery deployed to: ${lotteryAddress}`);
  console.log(`Entry fee: 0.01 ETH`);
  console.log(`Max players: 10`);
  console.log(`Network: ${(await ethers.provider.getNetwork()).name}`);

 
  const entryFee = await lottery.ENTRY_FEE();
  const maxPlayers = await lottery.MAX_PLAYERS();
  
  console.log(`\nContract verification:`);
  console.log(`- Entry fee: ${ethers.formatEther(entryFee)} ETH`);
  console.log(`- Max players: ${maxPlayers}`);
  console.log(`- Current round: ${await lottery.lotteryRound()}`);
  console.log(`- Player count: ${await lottery.getPlayerCount()}`);

  return lottery;
}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
