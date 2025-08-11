//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPiggyBank {
    event Deposited(address indexed user, uint256 indexed depositId, uint256 amount, bool isERC20);
    
    function depositETH(uint256 lockPeriod) external payable;
    function depositERC20(address token, uint256 amount, uint256 lockPeriod) external;
    function withdraw(uint256 index) external;
    function getDeposit(uint256 index) external view returns (uint256 amount, uint256 unlockTime, bool isERC20, address tokenAddress);
    function getDepositCount() external view returns (uint256);
}