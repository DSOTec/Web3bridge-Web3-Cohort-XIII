// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Lottery {
    uint256 public constant ENTRY_FEE = 0.01 ether;
    uint256 public constant MAX_PLAYERS = 10;
    
    address[] public players;
    mapping(address => bool) public hasEntered;
    uint256 public lotteryRound;
    address public lastWinner;
    uint256 public totalPrizePool;
    
    event PlayerEntered(address indexed player, uint256 round, uint256 playerCount);
    event WinnerSelected(address indexed winner, uint256 round, uint256 prizeAmount);
    event LotteryReset(uint256 newRound);
    
    modifier onlyValidEntry() {
        require(msg.value == ENTRY_FEE, "Must pay exactly 0.01 ETH to enter");
        require(!hasEntered[msg.sender], "Player has already entered this round");
        require(players.length < MAX_PLAYERS, "Lottery is full");
        _;
    }
   
    function enterLottery() external payable onlyValidEntry {
        players.push(msg.sender);
        hasEntered[msg.sender] = true;
        totalPrizePool += msg.value;
        
        emit PlayerEntered(msg.sender, lotteryRound, players.length);
        
        if (players.length == MAX_PLAYERS) {
            _selectWinner();
        }
    }
    
  
    function _selectWinner() internal {
        require(players.length == MAX_PLAYERS, "Not enough players");
        
        uint256 randomIndex = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.difficulty,
                    block.number,
                    players
                )
            )
        ) % players.length;
        
        address winner = players[randomIndex];
        uint256 prizeAmount = totalPrizePool;
        
        lastWinner = winner;
        
        emit WinnerSelected(winner, lotteryRound, prizeAmount);
        
      
        (bool success, ) = winner.call{value: prizeAmount}("");
        require(success, "Prize transfer failed");
        
     
        _resetLottery();
    }
  
    function _resetLottery() internal {
      
        for (uint256 i = 0; i < players.length; i++) {
            hasEntered[players[i]] = false;
        }
        delete players;
        
        
        totalPrizePool = 0;
        lotteryRound++;
        
        emit LotteryReset(lotteryRound);
    }
    
    
    function getPlayerCount() external view returns (uint256) {
        return players.length;
    }
    
   
    function getPlayers() external view returns (address[] memory) {
        return players;
    }
    
   
    function hasPlayerEntered(address player) external view returns (bool) {
        return hasEntered[player];
    }
    
   
    function getLotteryInfo() external view returns (
        uint256 currentRound,
        uint256 playerCount,
        uint256 prizePool,
        address winner,
        bool isActive
    ) {
        return (
            lotteryRound,
            players.length,
            totalPrizePool,
            lastWinner,
            players.length < MAX_PLAYERS
        );
    }
}
