import { ethers } from "hardhat";
// Note: ethers is available through the Hardhat Runtime Environment (HRE)

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const ClockNFT = await ethers.getContractFactory("ClockNFT");
    const clock = await ClockNFT.deploy();
    await clock.deployed();

    console.log("ClockNFT deployed to:", clock.address);
    return clock.address;
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

