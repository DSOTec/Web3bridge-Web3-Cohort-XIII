// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRoleNFT {
    function hasRole(address user, string memory role) external view returns (bool);
    function assignRole(uint256 tokenId, string memory role, uint256 duration) external;
    function mint(address to, string[] memory roles, uint256 duration) external;
}