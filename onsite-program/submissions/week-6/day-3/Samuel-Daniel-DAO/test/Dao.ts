import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { DAO, RoleNFT } from "../typechain-types";

describe("Token-Gated DAO", function () {
    let owner: SignerWithAddress;
    let voter: SignerWithAddress;
    let user: SignerWithAddress;
    let roleNFT: RoleNFT;
    let dao: DAO;

    beforeEach(async function () {
        [owner, voter, user] = await ethers.getSigners();

        // Deploy RoleNFT
        const RoleNFT = await ethers.getContractFactory("RoleNFT");
        roleNFT = await RoleNFT.deploy();
        await roleNFT.waitForDeployment();

        // Mint initial roles with expiration of 1 year (in seconds)
        const oneYearInSeconds = 365 * 24 * 60 * 60;
        
        // Mint token for owner with proposer, executor, and approver roles
        await (await roleNFT.mint(owner.address, ["proposer", "executor", "approver"], oneYearInSeconds)).wait();
        
        // Mint token for voter with voter role
        await (await roleNFT.mint(voter.address, ["voter"], oneYearInSeconds)).wait();
        
        // Mint a token for the user who will request a role (no roles initially)
        await (await roleNFT.mint(user.address, [], oneYearInSeconds)).wait();
        
        // Verify roles were assigned correctly
        expect(await roleNFT.hasRole(owner.address, "proposer")).to.be.true;
        expect(await roleNFT.hasRole(owner.address, "executor")).to.be.true;
        expect(await roleNFT.hasRole(voter.address, "voter")).to.be.true;
    });

    it("should allow role-based proposal creation and voting", async function () {
        const roleNFTAddress = await roleNFT.getAddress();
        
        // Deploy DAO contract first
        const DAO = await ethers.getContractFactory("DAO");
        console.log("Deploying DAO with RoleNFT at:", roleNFTAddress);
        
        dao = await DAO.deploy(roleNFTAddress);
        await dao.waitForDeployment();
        const daoAddress = await dao.getAddress();
        console.log("DAO deployed at:", daoAddress);
        
        // Mint a token for the DAO contract with approver role
        console.log("Minting approver token for DAO...");
        await (await roleNFT.mint(daoAddress, ["approver"], 365 * 24 * 60 * 60)).wait();
        console.log("Minted approver token for DAO");
        
        // Now transfer ownership of RoleNFT to DAO contract
        console.log("Transferring RoleNFT ownership to DAO...");
        await (await roleNFT.transferOwnership(daoAddress)).wait();
        console.log("Ownership transferred to DAO");
        
        // Verify roles before proceeding
        const isOwnerProposer = await roleNFT.hasRole(owner.address, "proposer");
        const isOwnerExecutor = await roleNFT.hasRole(owner.address, "executor");
        const isVoter = await roleNFT.hasRole(voter.address, "voter");
        const isDAOApprover = await roleNFT.hasRole(daoAddress, "approver");
        
        console.log("Role verification:");
        console.log("- Owner is proposer:", isOwnerProposer);
        console.log("- Owner is executor:", isOwnerExecutor);
        console.log("- Voter has voter role:", isVoter);
        console.log("- DAO has approver role:", isDAOApprover);
        
        // Make sure the DAO has the approver role before proceeding
        expect(isDAOApprover).to.be.true;
        
        // Test proposal flow
        console.log("Creating proposal...");
        await (await dao.connect(owner).createProposal("Add new feature")).wait();
        console.log("Proposal created");
        
        console.log("Voting on proposal...");
        await (await dao.connect(voter).vote(0)).wait();
        console.log("Vote recorded");
        
        console.log("Executing proposal...");
        await (await dao.connect(owner).executeProposal(0)).wait();
        console.log("Proposal executed");

        // Test role request flow
        console.log("Requesting voter role...");
        await (await dao.connect(user).requestRole("voter")).wait();
        console.log("Role requested");
        
        // The owner (who has the approver role) will approve the request
        const userTokenId = 2; // Third token minted (0, 1, 2)
        console.log("Approving role request...");
        await (await dao.connect(owner).approveRoleRequest(0, userTokenId, 7 * 24 * 60 * 60)).wait(); // 1 week
        console.log("Role request approved");
        
        // Verify the role was assigned
        const hasVoterRole = await roleNFT.hasRole(user.address, "voter");
        console.log("User has voter role:", hasVoterRole);
        expect(hasVoterRole).to.be.true;

        // Verify proposal was executed
        const proposals = await dao.getProposals();
        console.log("Proposal status - executed:", proposals[0].executed);
        expect(proposals[0].executed).to.be.true;
    });
});
