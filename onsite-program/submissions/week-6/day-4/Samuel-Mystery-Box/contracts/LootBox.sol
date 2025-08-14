// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Here is the VRF Interfaces
interface VRFCoordinatorV2Interface {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}

abstract contract VRFConsumerBaseV2 {
    error OnlyCoordinatorCanFulfill(address have, address want);
    address private immutable vrfCoordinator;

    constructor(address _vrfCoordinator) {
        vrfCoordinator = _vrfCoordinator;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal virtual;

    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        if (msg.sender != vrfCoordinator) {
            revert OnlyCoordinatorCanFulfill(msg.sender, vrfCoordinator);
        }
        fulfillRandomWords(requestId, randomWords);
    }
}
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";



contract LootBox is VRFConsumerBaseV2, Ownable, ReentrancyGuard, Pausable {
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    
    // VRF Configuration
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    
    // Box Configuration
    uint256 public boxPrice;
    uint256 public totalBoxesOpened;
    
    // Reward Types
    enum RewardType { ERC20, ERC721, ERC1155 }
    
    struct Reward {
        RewardType rewardType;
        address contractAddress;
        uint256 tokenId; // For ERC721/ERC1155
        uint256 amount; // For ERC20/ERC1155
        uint256 weight; // Probability weight
        bool isActive;
    }
    
    struct BoxOpening {
        address player;
        uint256 boxId;
        bool fulfilled;
        uint256 rewardIndex;
    }
    
    // Storage
    Reward[] public rewards;
    uint256 public totalWeight;
    mapping(uint256 => BoxOpening) public boxOpenings; // requestId => BoxOpening
    mapping(address => uint256[]) public playerBoxes;
    
    // Events
    event BoxOpened(
        address indexed player,
        uint256 indexed boxId,
        uint256 requestId
    );
    
    event RewardClaimed(
        address indexed player,
        uint256 indexed boxId,
        RewardType rewardType,
        address contractAddress,
        uint256 tokenId,
        uint256 amount
    );
    
    event RewardAdded(
        uint256 indexed rewardIndex,
        RewardType rewardType,
        address contractAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 weight
    );
    
    event RewardUpdated(
        uint256 indexed rewardIndex,
        uint256 newWeight,
        bool isActive
    );
    
    event BoxPriceUpdated(uint256 oldPrice, uint256 newPrice);
    
    // Errors
    error InsufficientPayment();
    error NoRewardsAvailable();
    error InvalidRewardIndex();
    error RewardNotActive();
    error BoxNotFulfilled();
    error UnauthorizedClaim();
    error TransferFailed();
    
    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        uint256 _boxPrice
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        boxPrice = _boxPrice;
    }

    function openBox() external payable nonReentrant whenNotPaused {
        if (msg.value < boxPrice) revert InsufficientPayment();
        if (totalWeight == 0) revert NoRewardsAvailable();
        
        // Request randomness from Chainlink VRF
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        
        uint256 boxId = totalBoxesOpened++;
        
        boxOpenings[requestId] = BoxOpening({
            player: msg.sender,
            boxId: boxId,
            fulfilled: false,
            rewardIndex: 0
        });
        
        playerBoxes[msg.sender].push(boxId);
        
        emit BoxOpened(msg.sender, boxId, requestId);
    }
    

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override {
        BoxOpening storage boxOpening = boxOpenings[requestId];
        
        if (boxOpening.player == address(0)) return;
        
        uint256 randomValue = randomWords[0] % totalWeight;
        uint256 rewardIndex = _selectRewardByWeight(randomValue);
        
        boxOpening.fulfilled = true;
        boxOpening.rewardIndex = rewardIndex;
        
        _distributeReward(boxOpening.player, boxOpening.boxId, rewardIndex);
    }

    function _distributeReward(
        address player,
        uint256 boxId,
        uint256 rewardIndex
    ) private {
        Reward storage reward = rewards[rewardIndex];
        
        if (!reward.isActive) revert RewardNotActive();
        
        if (reward.rewardType == RewardType.ERC20) {
            IERC20 token = IERC20(reward.contractAddress);
            bool success = token.transfer(player, reward.amount);
            if (!success) revert TransferFailed();
            
        } else if (reward.rewardType == RewardType.ERC721) {
            IERC721 nft = IERC721(reward.contractAddress);
            nft.safeTransferFrom(address(this), player, reward.tokenId);
            
        } else if (reward.rewardType == RewardType.ERC1155) {
            IERC1155 token = IERC1155(reward.contractAddress);
            token.safeTransferFrom(
                address(this),
                player,
                reward.tokenId,
                reward.amount,
                ""
            );
        }
        
        emit RewardClaimed(
            player,
            boxId,
            reward.rewardType,
            reward.contractAddress,
            reward.tokenId,
            reward.amount
        );
    }

    function _selectRewardByWeight(uint256 randomValue) private view returns (uint256) {
        uint256 currentWeight = 0;
        
        for (uint256 i = 0; i < rewards.length; i++) {
            if (!rewards[i].isActive) continue;
            
            currentWeight += rewards[i].weight;
            if (randomValue < currentWeight) {
                return i;
            }
        }
        
        // Fallback to last active reward (should not happen with proper weights)
        for (uint256 i = rewards.length; i > 0; i--) {
            if (rewards[i - 1].isActive) {
                return i - 1;
            }
        }
        
        revert NoRewardsAvailable();
    }
    
    // Admin Functions

    function addReward(
        RewardType rewardType,
        address contractAddress,
        uint256 tokenId,
        uint256 amount,
        uint256 weight
    ) external onlyOwner {
        rewards.push(Reward({
            rewardType: rewardType,
            contractAddress: contractAddress,
            tokenId: tokenId,
            amount: amount,
            weight: weight,
            isActive: true
        }));
        
        totalWeight += weight;
        
        emit RewardAdded(
            rewards.length - 1,
            rewardType,
            contractAddress,
            tokenId,
            amount,
            weight
        );
    }

    function updateReward(
        uint256 rewardIndex,
        uint256 newWeight,
        bool isActive
    ) external onlyOwner {
        if (rewardIndex >= rewards.length) revert InvalidRewardIndex();
        
        Reward storage reward = rewards[rewardIndex];
        
        // Update total weight
        if (reward.isActive) {
            totalWeight -= reward.weight;
        }
        if (isActive) {
            totalWeight += newWeight;
        }
        
        reward.weight = newWeight;
        reward.isActive = isActive;
        
        emit RewardUpdated(rewardIndex, newWeight, isActive);
    }

    function setBoxPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = boxPrice;
        boxPrice = newPrice;
        emit BoxPriceUpdated(oldPrice, newPrice);
    }

    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Withdraws contract balance to owner
     */
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = payable(owner()).call{value: balance}("");
        if (!success) revert TransferFailed();
    }
    

    function emergencyWithdrawERC20(
        address tokenAddress,
        uint256 amount
    ) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        bool success = token.transfer(owner(), amount);
        if (!success) revert TransferFailed();
    }
    
    // View Functions

    //Gets player's box history

    function getPlayerBoxes(address player) external view returns (uint256[] memory) {
        return playerBoxes[player];
    }
    
    //Gets reward details
    function getReward(uint256 index) external view returns (Reward memory) {
        if (index >= rewards.length) revert InvalidRewardIndex();
        return rewards[index];
    }
    
    /**
     * @dev Gets total number of rewards
     */
    function getRewardsCount() external view returns (uint256) {
        return rewards.length;
    }
    
    /**
     * @dev Gets all active rewards
     */
    function getActiveRewards() external view returns (Reward[] memory) {
        uint256 activeCount = 0;
        
        // Count active rewards
        for (uint256 i = 0; i < rewards.length; i++) {
            if (rewards[i].isActive) {
                activeCount++;
            }
        }
        
        // Create array of active rewards
        Reward[] memory activeRewards = new Reward[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < rewards.length; i++) {
            if (rewards[i].isActive) {
                activeRewards[index] = rewards[i];
                index++;
            }
        }
        
        return activeRewards;
    }
    
    // Required for receiving ERC721 and ERC1155 tokens
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }
    
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155Received.selector;
    }
    
    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }
}
