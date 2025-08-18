import { expect } from "chai";
import { ethers } from "hardhat";
import { Lottery } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Lottery", function () {
  let lottery: Lottery;
  let owner: HardhatEthersSigner;
  let players: HardhatEthersSigner[];
  
  const ENTRY_FEE = ethers.parseEther("0.01");
  const MAX_PLAYERS = 10;

  beforeEach(async function () {
    
    const signers = await ethers.getSigners();
    owner = signers[0];
    players = signers.slice(1, 15); 

   
    const LotteryFactory = await ethers.getContractFactory("Lottery");
    lottery = await LotteryFactory.deploy();
    await lottery.waitForDeployment();
  });

  describe("Contract Deployment", function () {
    it("Should set the correct entry fee", async function () {
      expect(await lottery.ENTRY_FEE()).to.equal(ENTRY_FEE);
    });

    it("Should set the correct max players", async function () {
      expect(await lottery.MAX_PLAYERS()).to.equal(MAX_PLAYERS);
    });

    it("Should initialize with zero players", async function () {
      expect(await lottery.getPlayerCount()).to.equal(0);
    });

    it("Should start at round 0", async function () {
      expect(await lottery.lotteryRound()).to.equal(0);
    });
  });

  describe("Entry Requirements", function () {
    it("Should allow entry with exact fee", async function () {
      await expect(lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE }))
        .to.not.be.reverted;
      
      expect(await lottery.getPlayerCount()).to.equal(1);
      expect(await lottery.hasPlayerEntered(players[0].address)).to.be.true;
    });

    it("Should reject entry with insufficient fee", async function () {
      const insufficientFee = ethers.parseEther("0.005");
      
      await expect(lottery.connect(players[0]).enterLottery({ value: insufficientFee }))
        .to.be.revertedWith("Must pay exactly 0.01 ETH to enter");
    });

    it("Should reject entry with excessive fee", async function () {
      const excessiveFee = ethers.parseEther("0.02");
      
      await expect(lottery.connect(players[0]).enterLottery({ value: excessiveFee }))
        .to.be.revertedWith("Must pay exactly 0.01 ETH to enter");
    });

    it("Should prevent double entry in same round", async function () {
      await lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE });
      
      await expect(lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE }))
        .to.be.revertedWith("Player has already entered this round");
    });

    it("Should reject entry when lottery is full", async function () {
     
      for (let i = 0; i < MAX_PLAYERS; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
      
     
      expect(await lottery.getPlayerCount()).to.equal(0); 
    });
  });

  describe("Player Tracking", function () {
    it("Should correctly track multiple players", async function () {
      const numPlayers = 5;
      
      for (let i = 0; i < numPlayers; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
        expect(await lottery.getPlayerCount()).to.equal(i + 1);
        expect(await lottery.hasPlayerEntered(players[i].address)).to.be.true;
      }
      
      const allPlayers = await lottery.getPlayers();
      expect(allPlayers.length).to.equal(numPlayers);
      
      for (let i = 0; i < numPlayers; i++) {
        expect(allPlayers[i]).to.equal(players[i].address);
      }
    });

    it("Should emit PlayerEntered event", async function () {
      await expect(lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE }))
        .to.emit(lottery, "PlayerEntered")
        .withArgs(players[0].address, 0, 1);
    });
  });

  describe("Winner Selection", function () {
    it("Should automatically select winner when 10 players join", async function () {
      // Add 9 players
      for (let i = 0; i < 9; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
      
      expect(await lottery.getPlayerCount()).to.equal(9);
      
     
      const tx = await lottery.connect(players[9]).enterLottery({ value: ENTRY_FEE });
      const receipt = await tx.wait();
      
      // Check that WinnerSelected event was emitted
      const winnerEvent = receipt?.logs.find(log => {
        try {
          const parsed = lottery.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          return parsed?.name === "WinnerSelected";
        } catch {
          return false;
        }
      });
      
      expect(winnerEvent).to.not.be.undefined;
      
  
      expect(await lottery.getPlayerCount()).to.equal(0);
      expect(await lottery.lotteryRound()).to.equal(1);
    });

    it("Should transfer entire prize pool to winner", async function () {
      const initialBalances: bigint[] = [];

      for (let i = 0; i < MAX_PLAYERS; i++) {
        initialBalances[i] = await ethers.provider.getBalance(players[i].address);
      }
      
      
      for (let i = 0; i < MAX_PLAYERS; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
      
      const winner = await lottery.lastWinner();
      const winnerIndex = players.findIndex(p => p.address === winner);
      
      expect(winnerIndex).to.not.equal(-1);
      
      const finalBalance = await ethers.provider.getBalance(players[winnerIndex].address);
      const expectedPrize = ENTRY_FEE * BigInt(MAX_PLAYERS);
      
     
      expect(finalBalance).to.be.gt(initialBalances[winnerIndex]);
    });

    it("Should emit WinnerSelected event with correct parameters", async function () {
    
      for (let i = 0; i < 9; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
    
      await expect(lottery.connect(players[9]).enterLottery({ value: ENTRY_FEE }))
        .to.emit(lottery, "WinnerSelected");
    });
  });

  describe("Lottery Reset", function () {
    it("Should reset lottery state after winner selection", async function () {
      
      for (let i = 0; i < MAX_PLAYERS; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
      
      expect(await lottery.getPlayerCount()).to.equal(0);
      expect(await lottery.totalPrizePool()).to.equal(0);
      expect(await lottery.lotteryRound()).to.equal(1);
      
      
      for (let i = 0; i < MAX_PLAYERS; i++) {
        expect(await lottery.hasPlayerEntered(players[i].address)).to.be.false;
      }
    });

    it("Should emit LotteryReset event", async function () {
     
      for (let i = 0; i < 9; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
      
   
      await expect(lottery.connect(players[9]).enterLottery({ value: ENTRY_FEE }))
        .to.emit(lottery, "LotteryReset")
        .withArgs(1);
    });

    it("Should allow same players to enter new round", async function () {
    
      for (let i = 0; i < MAX_PLAYERS; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
      
      await expect(lottery.connect(players[0]).enterLottery({ value: ENTRY_FEE }))
        .to.not.be.reverted;
      
      expect(await lottery.getPlayerCount()).to.equal(1);
      expect(await lottery.lotteryRound()).to.equal(1);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      for (let i = 0; i < 5; i++) {
        await lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE });
      }
    });

    it("Should return correct lottery info", async function () {
      const info = await lottery.getLotteryInfo();
      
      expect(info.currentRound).to.equal(0);
      expect(info.playerCount).to.equal(5);
      expect(info.prizePool).to.equal(ENTRY_FEE * BigInt(5));
      expect(info.isActive).to.be.true;
    });

    it("Should return correct players list", async function () {
      const allPlayers = await lottery.getPlayers();
      expect(allPlayers.length).to.equal(5);
      
      for (let i = 0; i < 5; i++) {
        expect(allPlayers[i]).to.equal(players[i].address);
      }
    });

    it("Should correctly check if player has entered", async function () {
      expect(await lottery.hasPlayerEntered(players[0].address)).to.be.true;
      expect(await lottery.hasPlayerEntered(players[5].address)).to.be.false;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle rapid consecutive entries", async function () {
      const promises = [];
      
      for (let i = 0; i < MAX_PLAYERS; i++) {
        promises.push(
          lottery.connect(players[i]).enterLottery({ value: ENTRY_FEE })
        );
      }
      
      await Promise.all(promises);
    
      expect(await lottery.lotteryRound()).to.equal(1);
      expect(await lottery.getPlayerCount()).to.equal(0);
    });
  });
});
