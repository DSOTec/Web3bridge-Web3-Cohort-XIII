import { ethers } from "hardhat";

async function main() {
    const RoleNFT = await ethers.getContractFactory("RoleNFT");
    const roleNFT = await RoleNFT.deploy();
    await roleNFT.deployed();
    console.log("RoleNFT deployed to:", roleNFT.address);

    const DAO = await ethers.getContractFactory("DAO");
    const dao = await DAO.deploy(roleNFT.address);
    await dao.deployed();
    console.log("DAO deployed to:", dao.address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
