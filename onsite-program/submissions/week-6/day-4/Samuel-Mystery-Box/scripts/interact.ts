import { ethers } from "hardhat";
import { LootBox, MockVRFCoordinator, MockERC20, MockERC721, MockERC1155 } from "../typechain-types";

async function main() {
    console.log("=== LootBox Interaction Demo ===\n");

    // Get signers
    const [deployer, player1, player2] = await ethers.getSigners();

    console.log("Deployer:", deployer.address);
    console.log("Player 1:", player1.address);
    console.log("Player 2:", player2.address);

    // Deploy contracts (reusing deployment logic)
    console.log("\n--- Deploying Contracts ---");

    // Deploy Mock VRF Coordinator
    const MockVRFCoordinatorFactory = await ethers.getContractFactory("MockVRFCoordinator");
    const mockVRF = await MockVRFCoordinatorFactory.deploy();
    await mockVRF.waitForDeployment();

    // Deploy Mock Tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockERC20 = await MockERC20Factory.deploy("Reward Token", "REWARD", 1000000);
    await mockERC20.waitForDeployment();

    const MockERC721Factory = await ethers.getContractFactory("MockERC721");
    const mockERC721 = await MockERC721Factory.deploy("Reward NFT", "RNFT", "https://api.example.com/nft/");
    await mockERC721.waitForDeployment();

    const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
    const mockERC1155 = await MockERC1155Factory.deploy("https://api.example.com/token/{id}.json");
    await mockERC1155.waitForDeployment();

    // Deploy LootBox
    const boxPrice = ethers.parseEther("0.1");
    const LootBoxFactory = await ethers.getContractFactory("LootBox");
    const lootBox = await LootBoxFactory.deploy(
        await mockVRF.getAddress(),
        1, // subscriptionId
        "0x0000000000000000000000000000000000000000000000000000000000000000", // gasLane
        500000, // callbackGasLimit
        boxPrice
    );
    await lootBox.waitForDeployment();

    console.log("Contracts deployed successfully!");

    // Setup rewards
    console.log("\n--- Setting up Rewards ---");
    const lootBoxAddress = await lootBox.getAddress();

    // Transfer tokens to LootBox
    await mockERC20.transfer(lootBoxAddress, ethers.parseUnits("10000", 18));
    await mockERC721.batchMint(lootBoxAddress, 10);
    await mockERC1155.createToken(lootBoxAddress, 100, "", "0x");
    await mockERC1155.createToken(lootBoxAddress, 50, "", "0x");

    // Add rewards
    await lootBox.addReward(0, await mockERC20.getAddress(), 0, ethers.parseUnits("100", 18), 500);
    await lootBox.addReward(1, await mockERC721.getAddress(), 0, 1, 150);
    await lootBox.addReward(1, await mockERC721.getAddress(), 1, 1, 150);
    await lootBox.addReward(2, await mockERC1155.getAddress(), 1, 10, 200);

    console.log("Rewards setup complete!");

    // Display reward information
    console.log("\n--- Reward Pool Information ---");
    const rewardsCount = await lootBox.getRewardsCount();
    const totalWeight = await lootBox.totalWeight();
    
    // Convert rewardsCount from bigint to number for array indexing
    const rewardsCountNum = Number(rewardsCount);
    
    // Example of proper bigint to number conversion
    const myBigInt = 123n;
    const myArray = [1, 2, 3];
    // Ensure the index is within bounds before accessing the array
    const index = Number(myBigInt) % myArray.length; // Using modulo to ensure it's within bounds
    const value = myArray[index];

    console.log(`Total Rewards: ${rewardsCount}`);
    console.log(`Total Weight: ${totalWeight}`);
    console.log(`Box Price: ${ethers.formatEther(boxPrice)} ETH`);

    for (let i = 0; i < rewardsCount; i++) {
        const reward = await lootBox.getReward(i);
        const rewardTypes = ["ERC20", "ERC721", "ERC1155"];
        const probability = (Number(reward.weight) / Number(totalWeight) * 100).toFixed(2);

        console.log(`\nReward ${i}:`);
        console.log(`  Type: ${rewardTypes[Number(reward.rewardType)]}`);
        console.log(`  Contract: ${reward.contractAddress}`);
        console.log(`  Token ID: ${reward.tokenId}`);
        console.log(`  Amount: ${reward.amount}`);
        console.log(`  Weight: ${reward.weight}`);
        console.log(`  Probability: ${probability}%`);
        console.log(`  Active: ${reward.isActive}`);
    }

    // Demonstrate box opening
    console.log("\n--- Opening Loot Boxes ---");

    // Function to open box and fulfill randomness
    async function openAndFulfillBox(player: any, playerName: string, randomValue: bigint) {
        console.log(`\n${playerName} is opening a loot box...`);

        // Check initial balances
        const initialERC20 = await mockERC20.balanceOf(player.address);
        const initialERC1155 = await mockERC1155.balanceOf(player.address, 1);

        console.log(`Initial ERC20 balance: ${ethers.formatUnits(initialERC20, 18)}`);
        console.log(`Initial ERC1155 balance: ${initialERC1155}`);

        // Open box
        const tx = await lootBox.connect(player).openBox({ value: boxPrice });
        const receipt = await tx.wait();

        // Extract requestId from events
        let requestId: bigint | undefined;
        for (const log of receipt?.logs || []) {
            try {
                const parsed = mockVRF.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                if (parsed?.name === "RandomWordsRequested") {
                    requestId = parsed.args[1];
                    break;
                }
            } catch {
                continue;
            }
        }

        if (!requestId) {
            console.log("Failed to extract requestId");
            return;
        }

        console.log(`Box opened! Request ID: ${requestId}`);

        // Fulfill randomness
        const randomWords = [randomValue];
        const fulfillTx = await mockVRF.fulfillRandomWords(requestId, randomWords);
        await fulfillTx.wait();

        console.log(`Random value used: ${randomValue}`);

        // Check final balances and determine what was won
        const finalERC20 = await mockERC20.balanceOf(player.address);
        const finalERC1155 = await mockERC1155.balanceOf(player.address, 1);

        if (finalERC20 > initialERC20) {
            const won = finalERC20 - initialERC20;
            console.log(` Won ${ethers.formatUnits(won, 18)} ERC20 tokens!`);
        } else if (finalERC1155 > initialERC1155) {
            const won = finalERC1155 - initialERC1155;
            console.log(`Won ${won} ERC1155 tokens!`);
        } else {
            // Check if NFT was won
            try {
                const nftOwner0 = await mockERC721.ownerOf(0);
                const nftOwner1 = await mockERC721.ownerOf(1);
                if (nftOwner0 === player.address) {
                    console.log(`Won ERC721 NFT #0!`);
                } else if (nftOwner1 === player.address) {
                    console.log(`Won ERC721 NFT #1!`);
                }
            } catch {
                console.log("Reward distribution unclear");
            }
        }
    }

    // Open boxes with different random values to demonstrate different rewards
    await openAndFulfillBox(player1, "Player 1", BigInt(250)); // Should get ERC20 (weight 0-499)
    await openAndFulfillBox(player2, "Player 2", BigInt(750)); // Should get ERC721 (weight 500-799)

    // Display final statistics
    console.log("\n--- Final Statistics ---");
    const totalBoxesOpened = await lootBox.totalBoxesOpened();
    console.log(`Total boxes opened: ${totalBoxesOpened}`);

    const player1Boxes = await lootBox.getPlayerBoxes(player1.address);
    const player2Boxes = await lootBox.getPlayerBoxes(player2.address);

    console.log(`Player 1 boxes: ${player1Boxes.length}`);
    console.log(`Player 2 boxes: ${player2Boxes.length}`);

    // Test admin functions
    console.log("\n--- Testing Admin Functions ---");

    // Update box price
    const newPrice = ethers.parseEther("0.15");
    await lootBox.setBoxPrice(newPrice);
    console.log(`✅ Updated box price to ${ethers.formatEther(newPrice)} ETH`);

    // Update reward weight
    await lootBox.updateReward(0, 600, true);
    console.log("✅ Updated reward 0 weight to 600");

    // Pause contract
    await lootBox.pause();
    console.log("✅ Contract paused");

    // Try to open box while paused (should fail)
    try {
        await lootBox.connect(player1).openBox({ value: newPrice });
        console.log("❌ Box opened while paused (unexpected)");
    } catch (error) {
        console.log("✅ Box opening correctly blocked while paused");
    }

    // Unpause
    await lootBox.unpause();
    console.log("✅ Contract unpaused");

    // Withdraw funds
    const contractBalance = await ethers.provider.getBalance(lootBoxAddress);
    if (contractBalance > 0) {
        await lootBox.withdraw();
        console.log(`✅ Withdrew ${ethers.formatEther(contractBalance)} ETH from contract`);
    }

    console.log("\n=== Demo Complete ===");
    console.log("All LootBox functions have been successfully tested!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
