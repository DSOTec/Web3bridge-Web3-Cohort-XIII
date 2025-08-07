// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IEmployee {
    function registerUser(address user, string calldata name, uint256 salary, uint8 role) external;
    function disburseSalary(address user, uint256 amount) external;
    function getAllUsers() external view returns (address[] memory);
    function getUserDetails(address user) external view returns (string memory, uint256, string memory, bool);
}
