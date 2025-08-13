import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers, ignition } from "hardhat";
import DaoModule from "../modules/dao";

async function deployDaoFixture() {
  // Deploy the DAO using the Ignition module
  const { dao } = await ignition.deploy(DaoModule);
  
  // Get the signers
  const [owner, otherAccount] = await ethers.getSigners();

  return { dao, owner, otherAccount };
}

describe("DAO Deployment", function () {
  it("Should deploy the DAO contract", async function () {
    const { dao } = await loadFixture(deployDaoFixture);
    
    // Basic verification that the contract was deployed
    expect(await dao.getAddress()).to.be.properAddress;
    console.log(`DAO deployed to: ${await dao.getAddress()}`);
  });

  it("Should have the correct owner", async function () {
    const { dao, owner } = await loadFixture(deployDaoFixture);
    
    // Verify the owner is set correctly
    expect(await dao.owner()).to.equal(owner.address);
  });
});
