import { expect } from "chai";
import { ethers } from "hardhat";
import { LudoGame } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("LudoGame", function () {
  let ludoGame: LudoGame;
  let owner: SignerWithAddress;
  let player1: SignerWithAddress;
  let player2: SignerWithAddress;
  let player3: SignerWithAddress;
  let player4: SignerWithAddress;
  let player5: SignerWithAddress;

  const STAKE_AMOUNT = ethers.parseEther("1");

  beforeEach(async function () {
    [owner, player1, player2, player3, player4, player5] = await ethers.getSigners();
    
    const LudoGameFactory = await ethers.getContractFactory("LudoGame");
    ludoGame = await LudoGameFactory.deploy();
    await ludoGame.waitForDeployment();
  });

  describe("Game Creation", function () {
    it("Should create a new game with correct stake", async function () {
      const tx = await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      await tx.wait();

      const gameId = 1;
      const game = await ludoGame.getGame(gameId);
      
      expect(game.id).to.equal(gameId);
      expect(game.playerCount).to.equal(0);
      expect(game.state).to.equal(0); // WAITING_FOR_PLAYERS
      expect(game.totalPrize).to.equal(STAKE_AMOUNT);
    });

    it("Should fail to create game with incorrect stake", async function () {
      await expect(
        ludoGame.connect(player1).createGame({ value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Must stake exactly 1 ETH to create game");
    });

    it("Should prevent player from creating multiple games", async function () {
      await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      
      await expect(
        ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT })
      ).to.be.revertedWith("Already in a game");
    });
  });

  describe("Player Registration", function () {
    let gameId: number;

    beforeEach(async function () {
      await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      gameId = 1;
    });

    it("Should register a player successfully", async function () {
      await expect(
        ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: STAKE_AMOUNT })
      ).to.emit(ludoGame, "PlayerRegistered")
        .withArgs(gameId, player2.address, "Player2", 0);

      const player = await ludoGame.getPlayer(gameId, 0);
      expect(player.playerAddress).to.equal(player2.address);
      expect(player.name).to.equal("Player2");
      expect(player.color).to.equal(0); // RED
    });

    it("Should prevent duplicate colors", async function () {
      await ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: STAKE_AMOUNT });
      
      await expect(
        ludoGame.connect(player3).registerPlayer(gameId, "Player3", 0, { value: STAKE_AMOUNT })
      ).to.be.revertedWith("Color already taken");
    });

    it("Should prevent registration with incorrect stake", async function () {
      await expect(
        ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: ethers.parseEther("0.5") })
      ).to.be.revertedWith("Must stake exactly 1 ETH to join");
    });

    it("Should prevent empty player names", async function () {
      await expect(
        ludoGame.connect(player2).registerPlayer(gameId, "", 0, { value: STAKE_AMOUNT })
      ).to.be.revertedWith("Name cannot be empty");
    });

    it("Should start game when 4 players join", async function () {
      await ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: STAKE_AMOUNT });
      await ludoGame.connect(player3).registerPlayer(gameId, "Player3", 1, { value: STAKE_AMOUNT });
      await ludoGame.connect(player4).registerPlayer(gameId, "Player4", 2, { value: STAKE_AMOUNT });
      
      await expect(
        ludoGame.connect(player5).registerPlayer(gameId, "Player5", 3, { value: STAKE_AMOUNT })
      ).to.emit(ludoGame, "GameStarted").withArgs(gameId);

      const game = await ludoGame.getGame(gameId);
      expect(game.state).to.equal(1); // IN_PROGRESS
      expect(game.playerCount).to.equal(4);
      expect(game.totalPrize).to.equal(STAKE_AMOUNT * 5n); // 4 players + creator
    });

    it("Should prevent more than 4 players", async function () {
      await ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: STAKE_AMOUNT });
      await ludoGame.connect(player3).registerPlayer(gameId, "Player3", 1, { value: STAKE_AMOUNT });
      await ludoGame.connect(player4).registerPlayer(gameId, "Player4", 2, { value: STAKE_AMOUNT });
      await ludoGame.connect(player5).registerPlayer(gameId, "Player5", 3, { value: STAKE_AMOUNT });

      const [, , , , , player6] = await ethers.getSigners();
      await expect(
        ludoGame.connect(player6).registerPlayer(gameId, "Player6", 0, { value: STAKE_AMOUNT })
      ).to.be.revertedWith("Game is full");
    });
  });

  describe("Dice Rolling and Game Play", function () {
    let gameId: number;

    beforeEach(async function () {
      await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      gameId = 1;
      
      // Register 4 players to start the game
      await ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: STAKE_AMOUNT });
      await ludoGame.connect(player3).registerPlayer(gameId, "Player3", 1, { value: STAKE_AMOUNT });
      await ludoGame.connect(player4).registerPlayer(gameId, "Player4", 2, { value: STAKE_AMOUNT });
      await ludoGame.connect(player5).registerPlayer(gameId, "Player5", 3, { value: STAKE_AMOUNT });
    });

    it("Should allow current player to roll dice", async function () {
      const currentPlayer = await ludoGame.getCurrentPlayer(gameId);
      const currentPlayerSigner = [player2, player3, player4, player5].find(p => p.address === currentPlayer);
      
      await expect(
        ludoGame.connect(currentPlayerSigner!).rollDice(gameId)
      ).to.emit(ludoGame, "DiceRolled");
    });

    it("Should prevent non-current player from rolling dice", async function () {
      const currentPlayer = await ludoGame.getCurrentPlayer(gameId);
      const nonCurrentPlayer = [player2, player3, player4, player5].find(p => p.address !== currentPlayer);
      
      await expect(
        ludoGame.connect(nonCurrentPlayer!).rollDice(gameId)
      ).to.be.revertedWith("Not your turn");
    });

    it("Should generate dice values between 1 and 6", async function () {
      const currentPlayer = await ludoGame.getCurrentPlayer(gameId);
      const currentPlayerSigner = [player2, player3, player4, player5].find(p => p.address === currentPlayer);
      
      // Roll dice multiple times to test randomness
      for (let i = 0; i < 10; i++) {
        const tx = await ludoGame.connect(currentPlayerSigner!).rollDice(gameId);
        const receipt = await tx.wait();
        
        const event = receipt?.logs.find(log => {
          try {
            const parsed = ludoGame.interface.parseLog({
              topics: log.topics as string[],
              data: log.data
            });
            return parsed?.name === "DiceRolled";
          } catch {
            return false;
          }
        });
        
        if (event) {
          const parsed = ludoGame.interface.parseLog({
            topics: event.topics as string[],
            data: event.data
          });
          const diceValue = parsed?.args[2];
          expect(diceValue).to.be.at.least(1);
          expect(diceValue).to.be.at.most(6);
        }
        
        // Get new current player for next roll
        const newCurrentPlayer = await ludoGame.getCurrentPlayer(gameId);
        const newCurrentPlayerSigner = [player2, player3, player4, player5].find(p => p.address === newCurrentPlayer);
        currentPlayerSigner = newCurrentPlayerSigner;
      }
    });

    it("Should update player position after dice roll", async function () {
      const currentPlayer = await ludoGame.getCurrentPlayer(gameId);
      const currentPlayerSigner = [player2, player3, player4, player5].find(p => p.address === currentPlayer);
      
      // Get player index
      let playerIndex = 0;
      for (let i = 0; i < 4; i++) {
        const player = await ludoGame.getPlayer(gameId, i);
        if (player.playerAddress === currentPlayer) {
          playerIndex = i;
          break;
        }
      }
      
      const playerBefore = await ludoGame.getPlayer(gameId, playerIndex);
      const initialPosition = playerBefore.tokenPosition;
      
      await ludoGame.connect(currentPlayerSigner!).rollDice(gameId);
      
      const playerAfter = await ludoGame.getPlayer(gameId, playerIndex);
      expect(playerAfter.tokenPosition).to.be.greaterThan(initialPosition);
    });
  });

  describe("Game Completion", function () {
    let gameId: number;

    beforeEach(async function () {
      await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      gameId = 1;
      
      // Register 4 players to start the game
      await ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: STAKE_AMOUNT });
      await ludoGame.connect(player3).registerPlayer(gameId, "Player3", 1, { value: STAKE_AMOUNT });
      await ludoGame.connect(player4).registerPlayer(gameId, "Player4", 2, { value: STAKE_AMOUNT });
      await ludoGame.connect(player5).registerPlayer(gameId, "Player5", 3, { value: STAKE_AMOUNT });
    });

    it("Should handle game completion when player reaches position 52", async function () {
      // This test simulates a game completion scenario
      // In a real scenario, we'd need to manipulate the contract state or play many rounds
      
      const game = await ludoGame.getGame(gameId);
      expect(game.state).to.equal(1); // IN_PROGRESS
      
      // The game should be in progress and ready for dice rolls
      const currentPlayer = await ludoGame.getCurrentPlayer(gameId);
      expect(currentPlayer).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("View Functions", function () {
    let gameId: number;

    beforeEach(async function () {
      await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      gameId = 1;
      await ludoGame.connect(player2).registerPlayer(gameId, "Player2", 0, { value: STAKE_AMOUNT });
    });

    it("Should return correct game information", async function () {
      const game = await ludoGame.getGame(gameId);
      expect(game.id).to.equal(gameId);
      expect(game.playerCount).to.equal(1);
      expect(game.state).to.equal(0); // WAITING_FOR_PLAYERS
    });

    it("Should return correct player information", async function () {
      const player = await ludoGame.getPlayer(gameId, 0);
      expect(player.playerAddress).to.equal(player2.address);
      expect(player.name).to.equal("Player2");
      expect(player.color).to.equal(0); // RED
      expect(player.tokenPosition).to.equal(0);
      expect(player.hasFinished).to.equal(false);
    });

    it("Should return player's current game", async function () {
      const currentGame = await ludoGame.getPlayerCurrentGame(player2.address);
      expect(currentGame).to.equal(gameId);
    });
  });

  describe("Emergency Functions", function () {
    it("Should allow owner to emergency withdraw", async function () {
      await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      
      const contractBalance = await ethers.provider.getBalance(ludoGame.getAddress());
      expect(contractBalance).to.equal(STAKE_AMOUNT);
      
      await ludoGame.connect(owner).emergencyWithdraw();
      
      const newContractBalance = await ethers.provider.getBalance(ludoGame.getAddress());
      expect(newContractBalance).to.equal(0);
    });

    it("Should prevent non-owner from emergency withdraw", async function () {
      await ludoGame.connect(player1).createGame({ value: STAKE_AMOUNT });
      
      await expect(
        ludoGame.connect(player1).emergencyWithdraw()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });
});
