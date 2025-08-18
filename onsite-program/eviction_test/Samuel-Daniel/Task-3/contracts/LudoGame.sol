// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LudoGame is ReentrancyGuard, Ownable {
    // Enums
    enum Color { RED, GREEN, BLUE, YELLOW }
    enum GameState { WAITING_FOR_PLAYERS, IN_PROGRESS, FINISHED }
    
    // Structs
    struct Player {
        address playerAddress;
        string name;
        Color color;
        uint256 score;
        bool isRegistered;
        uint256 tokenPosition; // Position on the board (0-51, with special positions for home)
        bool hasFinished;
    }
    
    struct Game {
        uint256 gameId;
        Player[4] players;
        uint8 playerCount;
        uint8 currentPlayerIndex;
        GameState state;
        uint256 stakeAmount;
        address winner;
        uint256 totalPrize;
        uint256 createdAt;
    }
    
    // State variables
    mapping(uint256 => Game) public games;
    mapping(address => uint256) public playerCurrentGame;
    uint256 public gameCounter;
    uint256 public constant STAKE_AMOUNT = 1 ether; // Fixed stake amount
    uint256 private nonce; // For randomness
    
    // Events
    event PlayerRegistered(uint256 indexed gameId, address indexed player, string name, Color color);
    event GameStarted(uint256 indexed gameId);
    event DiceRolled(uint256 indexed gameId, address indexed player, uint8 diceValue);
    event PlayerMoved(uint256 indexed gameId, address indexed player, uint256 newPosition);
    event GameFinished(uint256 indexed gameId, address indexed winner, uint256 prize);
    event StakeDeposited(uint256 indexed gameId, address indexed player, uint256 amount);
    
    constructor() Ownable(msg.sender) {}
    
    // Create a new game
    function createGame() external payable returns (uint256) {
        require(msg.value == STAKE_AMOUNT, "Must stake exactly 1 ETH to create game");
        require(playerCurrentGame[msg.sender] == 0, "Already in a game");
        
        gameCounter++;
        uint256 gameId = gameCounter;
        
        Game storage newGame = games[gameId];
        newGame.gameId = gameId;
        newGame.playerCount = 0;
        newGame.currentPlayerIndex = 0;
        newGame.state = GameState.WAITING_FOR_PLAYERS;
        newGame.stakeAmount = STAKE_AMOUNT;
        newGame.totalPrize = msg.value;
        newGame.createdAt = block.timestamp;
        
        playerCurrentGame[msg.sender] = gameId;
        
        emit StakeDeposited(gameId, msg.sender, msg.value);
        
        return gameId;
    }
    
    // Register player for a game
    function registerPlayer(uint256 gameId, string memory playerName, Color color) external payable {
        require(games[gameId].gameId != 0, "Game does not exist");
        require(games[gameId].state == GameState.WAITING_FOR_PLAYERS, "Game not accepting players");
        require(games[gameId].playerCount < 4, "Game is full");
        require(msg.value == STAKE_AMOUNT, "Must stake exactly 1 ETH to join");
        require(playerCurrentGame[msg.sender] == 0, "Already in a game");
        require(bytes(playerName).length > 0, "Name cannot be empty");
        
        // Check if color is already taken
        for (uint8 i = 0; i < games[gameId].playerCount; i++) {
            require(games[gameId].players[i].color != color, "Color already taken");
        }
        
        uint8 playerIndex = games[gameId].playerCount;
        games[gameId].players[playerIndex] = Player({
            playerAddress: msg.sender,
            name: playerName,
            color: color,
            score: 0,
            isRegistered: true,
            tokenPosition: 0, // Starting position
            hasFinished: false
        });
        
        games[gameId].playerCount++;
        games[gameId].totalPrize += msg.value;
        playerCurrentGame[msg.sender] = gameId;
        
        emit PlayerRegistered(gameId, msg.sender, playerName, color);
        emit StakeDeposited(gameId, msg.sender, msg.value);
        
        // Start game if 4 players joined
        if (games[gameId].playerCount == 4) {
            games[gameId].state = GameState.IN_PROGRESS;
            emit GameStarted(gameId);
        }
    }
    
    // Dice rolling algorithm with pseudo-randomness
    function rollDice(uint256 gameId) external returns (uint8) {
        require(games[gameId].state == GameState.IN_PROGRESS, "Game not in progress");
        require(isPlayerInGame(gameId, msg.sender), "Not a player in this game");
        require(isCurrentPlayer(gameId, msg.sender), "Not your turn");
        
        // Generate pseudo-random number between 1-6
        nonce++;
        uint256 randomHash = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            nonce,
            blockhash(block.number - 1)
        )));
        
        uint8 diceValue = uint8((randomHash % 6) + 1);
        
        emit DiceRolled(gameId, msg.sender, diceValue);
        
        // Move player's token
        moveToken(gameId, diceValue);
        
        // Move to next player
        nextPlayer(gameId);
        
        return diceValue;
    }
    
    // Move token based on dice roll
    function moveToken(uint256 gameId, uint8 diceValue) internal {
        uint8 playerIndex = getCurrentPlayerIndex(gameId, msg.sender);
        Player storage player = games[gameId].players[playerIndex];
        
        // Calculate new position
        uint256 newPosition = player.tokenPosition + diceValue;
        
        // Check if player reaches the end (position 52 means finished)
        if (newPosition >= 52) {
            newPosition = 52; // Finished position
            player.hasFinished = true;
            player.score += 100; // Bonus points for finishing
            
            // Check if this player won
            if (games[gameId].winner == address(0)) {
                games[gameId].winner = player.playerAddress;
                games[gameId].state = GameState.FINISHED;
                
                // Transfer prize to winner
                payable(player.playerAddress).transfer(games[gameId].totalPrize);
                
                // Clear player game associations
                for (uint8 i = 0; i < games[gameId].playerCount; i++) {
                    playerCurrentGame[games[gameId].players[i].playerAddress] = 0;
                }
                
                emit GameFinished(gameId, player.playerAddress, games[gameId].totalPrize);
            }
        }
        
        player.tokenPosition = newPosition;
        player.score += diceValue; // Add dice value to score
        
        emit PlayerMoved(gameId, player.playerAddress, newPosition);
    }
    
    // Move to next player's turn
    function nextPlayer(uint256 gameId) internal {
        games[gameId].currentPlayerIndex = (games[gameId].currentPlayerIndex + 1) % games[gameId].playerCount;
    }
    
    // Helper functions
    function isPlayerInGame(uint256 gameId, address player) internal view returns (bool) {
        for (uint8 i = 0; i < games[gameId].playerCount; i++) {
            if (games[gameId].players[i].playerAddress == player) {
                return true;
            }
        }
        return false;
    }
    
    function isCurrentPlayer(uint256 gameId, address player) internal view returns (bool) {
        uint8 currentIndex = games[gameId].currentPlayerIndex;
        return games[gameId].players[currentIndex].playerAddress == player;
    }
    
    function getCurrentPlayerIndex(uint256 gameId, address player) internal view returns (uint8) {
        for (uint8 i = 0; i < games[gameId].playerCount; i++) {
            if (games[gameId].players[i].playerAddress == player) {
                return i;
            }
        }
        revert("Player not found");
    }
    
    // View functions
    function getGame(uint256 gameId) external view returns (
        uint256 id,
        uint8 playerCount,
        uint8 currentPlayerIndex,
        GameState state,
        uint256 stakeAmount,
        address winner,
        uint256 totalPrize
    ) {
        Game storage game = games[gameId];
        return (
            game.gameId,
            game.playerCount,
            game.currentPlayerIndex,
            game.state,
            game.stakeAmount,
            game.winner,
            game.totalPrize
        );
    }
    
    function getPlayer(uint256 gameId, uint8 playerIndex) external view returns (
        address playerAddress,
        string memory name,
        Color color,
        uint256 score,
        uint256 tokenPosition,
        bool hasFinished
    ) {
        require(playerIndex < games[gameId].playerCount, "Invalid player index");
        Player storage player = games[gameId].players[playerIndex];
        return (
            player.playerAddress,
            player.name,
            player.color,
            player.score,
            player.tokenPosition,
            player.hasFinished
        );
    }
    
    function getCurrentPlayer(uint256 gameId) external view returns (address) {
        require(games[gameId].state == GameState.IN_PROGRESS, "Game not in progress");
        uint8 currentIndex = games[gameId].currentPlayerIndex;
        return games[gameId].players[currentIndex].playerAddress;
    }
    
    function getPlayerCurrentGame(address player) external view returns (uint256) {
        return playerCurrentGame[player];
    }
    
    // Emergency function to withdraw stuck funds (only owner)
    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
