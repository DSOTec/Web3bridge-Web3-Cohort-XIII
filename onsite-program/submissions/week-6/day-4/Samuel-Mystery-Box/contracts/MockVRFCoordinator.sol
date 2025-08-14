// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;


interface VRFCoordinatorV2Interface {
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}

interface VRFConsumerBaseV2Interface {
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external;
}


contract MockVRFCoordinator is VRFCoordinatorV2Interface {
    uint256 private _requestIdCounter = 1;
    mapping(uint256 => address) private _requestIdToConsumer;
    
    event RandomWordsRequested(
        bytes32 indexed keyHash,
        uint256 requestId,
        uint256 preSeed,
        uint64 indexed subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords,
        address indexed sender
    );
    
    function requestRandomWords(
        bytes32 keyHash,
        uint64 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external override returns (uint256 requestId) {
        requestId = _requestIdCounter++;
        _requestIdToConsumer[requestId] = msg.sender;
        
        emit RandomWordsRequested(
            keyHash,
            requestId,
            0, // preSeed
            subId,
            minimumRequestConfirmations,
            callbackGasLimit,
            numWords,
            msg.sender
        );
        
        return requestId;
    }
    
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        address consumer = _requestIdToConsumer[requestId];
        require(consumer != address(0), "Invalid request ID");
        
        VRFConsumerBaseV2Interface(consumer).rawFulfillRandomWords(requestId, randomWords);
    }

    function createSubscription() external pure returns (uint64 subId) {
        return 1;
    }
    
    function addConsumer(uint64 subId, address consumer) external {}
    
    function removeConsumer(uint64 subId, address consumer) external {}
    
    function cancelSubscription(uint64 subId, address to) external {}
    
    function pendingRequestExists(uint64 /*subId*/) external pure returns (bool) {
        return false;
    }
    
    function getRequestConfig() external pure returns (uint16, uint32, bytes32[] memory) {
        bytes32[] memory keyHashes = new bytes32[](1);
        keyHashes[0] = 0x0000000000000000000000000000000000000000000000000000000000000000;
        return (3, 2000000, keyHashes);
    }
    
    function getSubscription(uint64 /*subId*/) external pure returns (
        uint96 balance,
        uint64 reqCount,
        address owner,
        address[] memory consumers
    ) {
        address[] memory emptyConsumers = new address[](0);
        return (0, 0, address(0), emptyConsumers);
    }
}
