import { ethers } from "hardhat";

async function main() {
    const RoleNFT = await ethers.getContractFactory("RoleNFT");
    const roleNFT = await RoleNFT.deploy();
    await roleNFT.waitForDeployment();
    console.log("RoleNFT deployed to:", await roleNFT.getAddress());

    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(await roleNFT.getAddress());
    await dao.waitForDeployment();
    console.log("DAO deployed to:", await dao.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
