//SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPiggyBank.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract PiggyBank is IPiggyBank {
    address public owner;
    address public factoryAdmin;

    struct Deposit {
        uint256 amount;
        uint256 unlockTime;
        bool isERC20;
        address tokenAddress;
    }

    Deposit[] public deposits;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _owner, address _admin) {
        owner = _owner;
        factoryAdmin = _admin;
    }

    function depositETH(uint256 lockPeriod) external payable override onlyOwner {
        require(msg.value > 0, "Cannot deposit 0 ETH");
        uint256 depositId = deposits.length;
        deposits.push(Deposit({
            amount: msg.value,
            unlockTime: block.timestamp + lockPeriod,
            isERC20: false,
            tokenAddress: address(0)
        }));
        emit Deposited(msg.sender, depositId, msg.value, false);
    }

    function depositERC20(address token, uint256 amount, uint256 lockPeriod) external override onlyOwner {
        require(amount > 0, "Cannot deposit 0 tokens");
        require(token != address(0), "Invalid token address");
        
        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Token transfer failed");
        
        uint256 depositId = deposits.length;
        deposits.push(Deposit({
            amount: amount,
            unlockTime: block.timestamp + lockPeriod,
            isERC20: true,
            tokenAddress: token
        }));
        emit Deposited(msg.sender, depositId, amount, true);
    }

    function withdraw(uint256 index) external override onlyOwner {
        require(index < deposits.length, "Invalid deposit index");
        Deposit storage dep = deposits[index];
        require(dep.amount > 0, "Already withdrawn");
        
        uint256 amount = dep.amount;
        dep.amount = 0;
        
        if (block.timestamp < dep.unlockTime) {
            // Early withdrawal with 3% fee
            uint256 fee = (amount * 3) / 100;
            amount -= fee;
            
            if (dep.isERC20) {
                bool success = IERC20(dep.tokenAddress).transfer(factoryAdmin, fee);
                require(success, "Fee transfer failed");
                success = IERC20(dep.tokenAddress).transfer(owner, amount);
                require(success, "Token transfer failed");
            } else {
                (bool success, ) = payable(factoryAdmin).call{value: fee}("");
                require(success, "ETH fee transfer failed");
                (success, ) = payable(owner).call{value: amount}("");
                require(success, "ETH transfer failed");
            }
        } else {
            // Normal withdrawal without fee
            if (dep.isERC20) {
                bool success = IERC20(dep.tokenAddress).transfer(owner, amount);
                require(success, "Token transfer failed");
            } else {
                (bool success, ) = payable(owner).call{value: amount}("");
                require(success, "ETH transfer failed");
            }
        }
    }

    function getDeposit(uint256 index) external view override returns (uint256 amount, uint256 unlockTime, bool isERC20, address tokenAddress) {
        require(index < deposits.length, "Invalid deposit index");
        Deposit memory deposit = deposits[index];
        return (deposit.amount, deposit.unlockTime, deposit.isERC20, deposit.tokenAddress);
    }

    function getDepositCount() external view override returns (uint256) {
        return deposits.length;
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}



