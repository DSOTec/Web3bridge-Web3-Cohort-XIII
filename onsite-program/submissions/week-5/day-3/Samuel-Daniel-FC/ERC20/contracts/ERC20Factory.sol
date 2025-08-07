// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ERC20.sol";

contract ERC20Factory {
    // Array to keep track of deployed token addresses
    address[] public allTokens;

    // Event emitted when a new token is created
    event TokenCreated(address indexed tokenAddress, address indexed creator);

    // Function to deploy a new ERC20 token
    function createToken(uint256 initialSupply) external returns (address) {
        ERC20 token = new ERC20();
        token.mint(msg.sender, initialSupply);
        allTokens.push(address(token));
        emit TokenCreated(address(token), msg.sender);
        return address(token);
    }

    // View function to get all deployed token addresses
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
}
