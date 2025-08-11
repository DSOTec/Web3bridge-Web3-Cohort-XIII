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

    function withdraw(uint256 index) external onlyOwner{
        Deposit storage dep = deposits[index];
        require(dep.amount > 0, "Already withdrawn");
        uint256 amount = dep.amount;
        dep.amount = 0;
        if(block.timestamp < dep.unlockTime){
            uint256 fee = (amount * 3)/ 100;
            amount -= fee;
            if(dep.isERC20){
                IERC20(dep.tokenAddress).transfer(factoryAdmin, fee);
                IERC20(dep.tokenAddress).transfer(owner, amount);
            } else{
                payable(factoryAdmin).transfer(fee);
                payable(owner).transfer(amount);
            } else{
            if(dep.isERC20){
           IERC20(dep.tokenAddress).transfer(owner, amount);
          }else{
         payable(owner).tranfer(amount);
        }
            }
            }
        }
    function  getDeposit(uint256 index) external view returns (Deposit memory){
        return deposits[index];
    }

    function getDepositCount() external view returns (uint256){
        return deposits.length;
}



