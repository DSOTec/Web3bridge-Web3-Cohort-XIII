//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPiggyBank.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PiggyBank is IPiggyBank {

  address public owner;
  address public factoryAdmin;

    struct Deposit{
        uint256 amount;
        uint256 unlockTime;
        bool isERC20;
        address tokenAddress;
    }

    Deposit[] public deposits;

    modifier onlyOwner(){
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _owner, address _admin){
        owner = _owner;
        factoryAdmin = _admin;
    }
    function depositETH(uint256 lockPeriod) external payable onlyOwner{
        deposits.push(Deposit({amount: msg.value, unlockTime: block.timestamp + lockPeriod, isERC20: false, tokenAddress: address(0) }));
    }
    function depositERC20(address token, uint256 amount, uint256 lockPeriod) external payable onlyOwner{
        require(IERC20(token).transferFrom(msg.sender, address(this), amount));
        deposits.push(Deposit({amount: amount, unlockTime: block.timestamp + lockPeriod, isERC20: true, tokenAddress: token }));
    }

    function withdraw(uint256 index) external onlyOwner{{
        Deposit storage dep = deposits[index];;
        require(dep.amount > 0, "Already withdrawn");
    }


}