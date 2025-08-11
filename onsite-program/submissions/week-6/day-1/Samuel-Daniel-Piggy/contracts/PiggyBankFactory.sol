//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PiggyBank.sol";

contract PiggyBankFactory {
  address public admin;
    mapping(address => address[]) public userPiggyBanks;

    event PiggyBankCreated(address indexed user, address piggyBank);

    constructor(){
        admin = msg.sender;
}
    function createPiggyBank() external {

        PiggyBank newBank = new PiggyBank(msg.sender, admin);
        userPiggyBanks[msg.sender].push(address(newBank));
        emit PiggyBankCreated(msg.sender, address(newBank));
    }

    function getUserPiggyBanks(address user) external view returns (address[] memory){
        return userPiggyBanks[user];
    }

    function getUserPiggyCount(address user) external view returns (uint256){
        return userPiggyBanks[user].length;
    }
}