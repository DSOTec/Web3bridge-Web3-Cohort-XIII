import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract, Signer } from "ethers";
import { LootBox, MockVRFCoordinator, MockERC20, MockERC721, MockERC1155 } from "../typechain-types";

describe("LootBox", function () {
  let lootBox: LootBox;
  let mockVRF: MockVRFCoordinator;
  let mockERC20: MockERC20;
  let mockERC721: MockERC721;
  let mockERC1155: MockERC1155;
  
  let owner: Signer;
  let player1: Signer;
  let player2: Signer;
  
  const BOX_PRICE = ethers.parseEther("0.1");
  const SUBSCRIPTION_ID = 1;
  const GAS_LANE = "0x0000000000000000000000000000000000000000000000000000000000000000";
  const CALLBACK_GAS_LIMIT = 500000;
  
  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();
    
    // Deploy Mock VRF Coordinator
    const MockVRFCoordinatorFactory = await ethers.getContractFactory("MockVRFCoordinator");
    mockVRF = await MockVRFCoordinatorFactory.deploy();
    await mockVRF.waitForDeployment();
    
    // Deploy LootBox
    const LootBoxFactory = await ethers.getContractFactory("LootBox");
    lootBox = await LootBoxFactory.deploy(
      await mockVRF.getAddress(),
      SUBSCRIPTION_ID,
      GAS_LANE,
      CALLBACK_GAS_LIMIT,
      BOX_PRICE
    );
    await lootBox.waitForDeployment();
    
    // Deploy Mock Tokens
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20Factory.deploy("Test Token", "TEST", 1000000);
    await mockERC20.waitForDeployment();
    
    const MockERC721Factory = await ethers.getContractFactory("MockERC721");
    mockERC721 = await MockERC721Factory.deploy("Test NFT", "TNFT", "https://test.com/");
    await mockERC721.waitForDeployment();
    
    const MockERC1155Factory = await ethers.getContractFactory("MockERC1155");
    mockERC1155 = await MockERC1155Factory.deploy("https://test.com/{id}.json");
    await mockERC1155.waitForDeployment();
    
    // Setup rewards in LootBox
    await setupRewards();
  });
  
  async function setupRewards() {
    const lootBoxAddress = await lootBox.getAddress();
    
    // Transfer tokens to LootBox for rewards
    await mockERC20.transfer(lootBoxAddress, ethers.parseUnits("10000", 18));
    
    // Mint NFTs to LootBox
    const nftIds = await mockERC721.batchMint(lootBoxAddress, 10);
    
    // Create ERC1155 tokens for LootBox
    await mockERC1155.createToken(lootBoxAddress, 100, "", "0x");
    await mockERC1155.createToken(lootBoxAddress, 50, "", "0x");
    
    // Add ERC20 rewards (common - 50% chance)
    await lootBox.addReward(
      0, // ERC20
      await mockERC20.getAddress(),
      0, // tokenId (not used for ERC20)
      ethers.parseUnits("100", 18), // 100 tokens
      500 // weight
    );
    
    // Add ERC721 rewards (rare - 30% chance)
    await lootBox.addReward(
      1, // ERC721
      await mockERC721.getAddress(),
      0, // first NFT
      1, // amount (always 1 for ERC721)
      300 // weight
    );
    
    await lootBox.addReward(
      1, // ERC721
      await mockERC721.getAddress(),
      1, // second NFT
      1,
      300
    );
    
    // Add ERC1155 rewards (legendary - 20% chance)
    await lootBox.addReward(
      2, // ERC1155
      await mockERC1155.getAddress(),
      1, // token ID 1
      10, // amount
      200 // weight
    );
  }
  
  describe("Deployment", function () {
    it("Should set the correct initial values", async function () {
      expect(await lootBox.boxPrice()).to.equal(BOX_PRICE);
      expect(await lootBox.totalBoxesOpened()).to.equal(0);
      expect(await lootBox.totalWeight()).to.equal(1300); // 500 + 300 + 300 + 200
    });
    
    it("Should set the correct owner", async function () {
      expect(await lootBox.owner()).to.equal(await owner.getAddress());
    });
  });
  
  describe("Reward Management", function () {
    it("Should add rewards correctly", async function () {
      const rewardsCount = await lootBox.getRewardsCount();
      expect(rewardsCount).to.equal(4);
      
      const reward = await lootBox.getReward(0);
      expect(reward.rewardType).to.equal(0); // ERC20
      expect(reward.contractAddress).to.equal(await mockERC20.getAddress());
      expect(reward.amount).to.equal(ethers.parseUnits("100", 18));
      expect(reward.weight).to.equal(500);
      expect(reward.isActive).to.be.true;
    });
    
    it("Should update reward weight and status", async function () {
      await lootBox.updateReward(0, 600, false);
      
      const reward = await lootBox.getReward(0);
      expect(reward.weight).to.equal(600);
      expect(reward.isActive).to.be.false;
      
      // Total weight should be updated (1300 - 500 = 800, since reward is inactive)
      expect(await lootBox.totalWeight()).to.equal(800);
    });
    
    it("Should get active rewards only", async function () {
      await lootBox.updateReward(0, 500, false); // Deactivate first reward
      
      const activeRewards = await lootBox.getActiveRewards();
      expect(activeRewards.length).to.equal(3);
    });
    
    it("Should emit RewardAdded event", async function () {
      await expect(
        lootBox.addReward(
          0, // ERC20
          await mockERC20.getAddress(),
          0,
          ethers.parseUnits("50", 18),
          100
        )
      ).to.emit(lootBox, "RewardAdded")
        .withArgs(4, 0, await mockERC20.getAddress(), 0, ethers.parseUnits("50", 18), 100);
    });
  });
  
  describe("Box Opening", function () {
    it("Should fail if insufficient payment", async function () {
      await expect(
        lootBox.connect(player1).openBox({ value: ethers.parseEther("0.05") })
      ).to.be.revertedWithCustomError(lootBox, "InsufficientPayment");
    });
    
    it("Should fail if no rewards available", async function () {
      // Deploy new LootBox without rewards
      const LootBoxFactory = await ethers.getContractFactory("LootBox");
      const emptyLootBox = await LootBoxFactory.deploy(
        await mockVRF.getAddress(),
        SUBSCRIPTION_ID,
        GAS_LANE,
        CALLBACK_GAS_LIMIT,
        BOX_PRICE
      );
      
      await expect(
        emptyLootBox.connect(player1).openBox({ value: BOX_PRICE })
      ).to.be.revertedWithCustomError(emptyLootBox, "NoRewardsAvailable");
    });
    
    it("Should open box successfully", async function () {
      const tx = await lootBox.connect(player1).openBox({ value: BOX_PRICE });
      const receipt = await tx.wait();
      
      expect(await lootBox.totalBoxesOpened()).to.equal(1);
      
      // Check if BoxOpened event was emitted
      const events = receipt?.logs || [];
      const boxOpenedEvent = events.find(log => {
        try {
          const parsed = lootBox.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          return parsed?.name === "BoxOpened";
        } catch {
          return false;
        }
      });
      
      expect(boxOpenedEvent).to.not.be.undefined;
    });
    
    it("Should track player boxes", async function () {
      await lootBox.connect(player1).openBox({ value: BOX_PRICE });
      await lootBox.connect(player1).openBox({ value: BOX_PRICE });
      
      const playerBoxes = await lootBox.getPlayerBoxes(await player1.getAddress());
      expect(playerBoxes.length).to.equal(2);
      expect(playerBoxes[0]).to.equal(0);
      expect(playerBoxes[1]).to.equal(1);
    });
  });
  
  describe("VRF Integration", function () {
    it("Should fulfill random words and distribute rewards", async function () {
      // Open a box
      const tx = await lootBox.connect(player1).openBox({ value: BOX_PRICE });
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
          // Continue if parsing fails
        }
      }
      
      expect(requestId).to.not.be.undefined;
      
      // Fulfill the request with mock randomness
      const randomWords = [BigInt(250)]; // This should select reward index 0 (ERC20)
      await mockVRF.fulfillRandomWords(requestId!, randomWords);
      
      // Check if reward was distributed
      const player1Address = await player1.getAddress();
      const balance = await mockERC20.balanceOf(player1Address);
      expect(balance).to.equal(ethers.parseUnits("100", 18));
    });
    
    it("Should handle different reward types based on randomness", async function () {
      // Test ERC721 reward (randomness that selects index 1)
      const tx = await lootBox.connect(player2).openBox({ value: BOX_PRICE });
      const receipt = await tx.wait();
      
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
          // Continue if parsing fails
        }
      }
      
      // Use randomness that selects ERC721 reward (index 1)
      const randomWords = [BigInt(750)]; // Should select reward at index 1
      await mockVRF.fulfillRandomWords(requestId!, randomWords);
      
      // Check if NFT was transferred
      const player2Address = await player2.getAddress();
      const nftOwner = await mockERC721.ownerOf(0);
      expect(nftOwner).to.equal(player2Address);
    });
  });
  
  describe("Admin Functions", function () {
    it("Should allow owner to set box price", async function () {
      const newPrice = ethers.parseEther("0.2");
      
      await expect(lootBox.setBoxPrice(newPrice))
        .to.emit(lootBox, "BoxPriceUpdated")
        .withArgs(BOX_PRICE, newPrice);
      
      expect(await lootBox.boxPrice()).to.equal(newPrice);
    });
    
    it("Should allow owner to pause/unpause", async function () {
      await lootBox.pause();
      
      await expect(
        lootBox.connect(player1).openBox({ value: BOX_PRICE })
      ).to.be.revertedWith("Pausable: paused");
      
      await lootBox.unpause();
      
      // Should work after unpause
      await expect(
        lootBox.connect(player1).openBox({ value: BOX_PRICE })
      ).to.not.be.reverted;
    });
    
    it("Should allow owner to withdraw funds", async function () {
      // Open some boxes to generate revenue
      await lootBox.connect(player1).openBox({ value: BOX_PRICE });
      await lootBox.connect(player2).openBox({ value: BOX_PRICE });
      
      const ownerBalanceBefore = await ethers.provider.getBalance(await owner.getAddress());
      const contractBalance = await ethers.provider.getBalance(await lootBox.getAddress());
      
      const tx = await lootBox.withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(await owner.getAddress());
      
      expect(ownerBalanceAfter).to.equal(
        ownerBalanceBefore + contractBalance - gasUsed
      );
    });
    
    it("Should not allow non-owner to call admin functions", async function () {
      await expect(
        lootBox.connect(player1).setBoxPrice(ethers.parseEther("0.2"))
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        lootBox.connect(player1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      
      await expect(
        lootBox.connect(player1).withdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
  
  describe("Edge Cases", function () {
    it("Should handle multiple box openings correctly", async function () {
      const numBoxes = 5;
      const promises = [];
      
      for (let i = 0; i < numBoxes; i++) {
        promises.push(
          lootBox.connect(player1).openBox({ value: BOX_PRICE })
        );
      }
      
      await Promise.all(promises);
      
      expect(await lootBox.totalBoxesOpened()).to.equal(numBoxes);
      
      const playerBoxes = await lootBox.getPlayerBoxes(await player1.getAddress());
      expect(playerBoxes.length).to.equal(numBoxes);
    });
    
    it("Should handle reward weight edge cases", async function () {
      // Test with randomness at exact weight boundaries
      const tx = await lootBox.connect(player1).openBox({ value: BOX_PRICE });
      const receipt = await tx.wait();
      
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
          // Continue
        }
      }
      
      // Test boundary cases
      const randomWords = [BigInt(499)]; // Should select first reward (weight 500)
      await mockVRF.fulfillRandomWords(requestId!, randomWords);
      
      const balance = await mockERC20.balanceOf(await player1.getAddress());
      expect(balance).to.equal(ethers.parseUnits("100", 18));
    });
  });
  
  describe("Gas Optimization Tests", function () {
    it("Should have reasonable gas costs for box opening", async function () {
      const tx = await lootBox.connect(player1).openBox({ value: BOX_PRICE });
      const receipt = await tx.wait();
      
      console.log(`Gas used for opening box: ${receipt?.gasUsed}`);
      
      // Should be under 200k gas for box opening
      expect(receipt?.gasUsed).to.be.lessThan(200000);
    });
  });
});
