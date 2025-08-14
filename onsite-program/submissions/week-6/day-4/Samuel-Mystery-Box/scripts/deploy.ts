import { ethers } from "hardhat";
import { Contract } from "ethers";

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);
    console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString());

    // Deploy Mock VRF Coordinator (for testing)
    console.log("\n--- Deploying Mock VRF Coordinator ---");
    const MockVRFCoordinatorFactory = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRF = await MockVRFCoordinatorFactory.deploy();
    await mockVRF.waitForDeployment();
    console.log("MockVRFCoordinator deployed to:", await mockVRF.getAddress());

    // Deploy Mock Tokens
    console.log("\n--- Deploying Mock Tokens ---");

    // Deploy Mock ERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockERC20 = await MockERC20Factory.deploy("Reward Token", "REWARD", 1000000);
    await mockERC20.waitForDeployment();
    console.log("MockERC20 deployed to:", await mockERC20.getAddress());

    // Deploy Mock ERC721
    const MockERC721Factory = await ethers.getContractFactory("MockERC721");
    const mockERC721 = await MockERC721Factory.deploy("Reward NFT", "RNFT", "https://api.example.com/nft/");
    await mockERC721.waitForDeployment();
    console.log("MockERC721 deployed to:", await mockERC721.getAddress());

    // Deploy Mock ERC1155
    const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
    const mockERC1155 = await MockERC1155Factory.deploy("https://api.example.com/token/{id}.json");
    await mockERC1155.waitForDeployment();
    console.log("MockERC1155 deployed to:", await mockERC1155.getAddress());

    // Deploy LootBox
    console.log("\n--- Deploying LootBox ---");
    const boxPrice = ethers.parseEther("0.1"); // 0.1 ETH per box
    const subscriptionId = 1;
    const gasLane = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const callbackGasLimit = 500000;

    const LootBoxFactory = await ethers.getContractFactory("LootBox");
    const lootBox = await LootBoxFactory.deploy(
        await mockVRF.getAddress(),
        subscriptionId,
        gasLane,
        callbackGasLimit,
        boxPrice
    );
    await lootBox.waitForDeployment();
    console.log("LootBox deployed to:", await lootBox.getAddress());

    // Setup rewards
    console.log("\n--- Setting up rewards ---");

    const lootBoxAddress = await lootBox.getAddress();

    // Transfer tokens to LootBox for rewards
    console.log("Transferring ERC20 tokens to LootBox...");
    await mockERC20.transfer(lootBoxAddress, ethers.parseUnits("10000", 18));

    // Mint NFTs to LootBox
    console.log("Minting NFTs to LootBox...");
    const nftIds = await mockERC721.batchMint(lootBoxAddress, 10);
    console.log("Minted NFT IDs:", nftIds);

    // Create ERC1155 tokens for LootBox
    console.log("Creating ERC1155 tokens for LootBox...");
    await mockERC1155.createToken(lootBoxAddress, 100, "", "0x");
    await mockERC1155.createToken(lootBoxAddress, 50, "", "0x");

    // Add rewards to LootBox
    console.log("Adding rewards to LootBox...");

    // ERC20 rewards (common - 50% chance)
    await lootBox.addReward(
        0, // ERC20
        await mockERC20.getAddress(),
        0,
        ethers.parseUnits("100", 18), // 100 tokens
        500 // weight
    );
    console.log("Added ERC20 reward: 100 tokens, weight 500");

    // ERC721 rewards (rare - 30% chance total)
    await lootBox.addReward(
        1, // ERC721
        await mockERC721.getAddress(),
        0, // NFT ID 0
        1,
        150 // weight
    );
    console.log("Added ERC721 reward: NFT #0, weight 150");

    await lootBox.addReward(
        1, // ERC721
        await mockERC721.getAddress(),
        1, // NFT ID 1
        1,
        150 // weight
    );
    console.log("Added ERC721 reward: NFT #1, weight 150");

    // ERC1155 rewards (legendary - 20% chance)
    await lootBox.addReward(
        2, // ERC1155
        await mockERC1155.getAddress(),
        1, // token ID 1
        10, // amount
        200 // weight
    );
    console.log("Added ERC1155 reward: 10x Token #1, weight 200");

    console.log("\n--- Deployment Summary ---");
    console.log("MockVRFCoordinator:", await mockVRF.getAddress());
    console.log("MockERC20:", await mockERC20.getAddress());
    console.log("MockERC721:", await mockERC721.getAddress());
    console.log("MockERC1155:", await mockERC1155.getAddress());
    console.log("LootBox:", await lootBox.getAddress());
    console.log("Box Price:", ethers.formatEther(boxPrice), "ETH");
    console.log("Total Weight:", await lootBox.totalWeight());

    // Save deployment addresses
    const deploymentInfo = {
        network: "localhost",
        contracts: {
            MockVRFCoordinator: await mockVRF.getAddress(),
            MockERC20: await mockERC20.getAddress(),
            MockERC721: await mockERC721.getAddress(),
            MockERC1155: await mockERC1155.getAddress(),
            LootBox: await lootBox.getAddress()
        },
        config: {
            boxPrice: boxPrice.toString(),
            totalWeight: (await lootBox.totalWeight()).toString()
        }
    };

    console.log("\nDeployment complete! Save this info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
