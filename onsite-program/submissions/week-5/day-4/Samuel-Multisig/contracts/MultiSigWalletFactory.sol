// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MultiSigWallet.sol";

contract MultiSigWalletFactory {
    address[] public deployedWallets;

    event WalletCreated(address walletAddress, address[] owners, uint requiredApprovals);

    function createWallet(address[] memory owners, uint requiredApprovals) external {
        MultiSigWallet wallet = new MultiSigWallet(owners, requiredApprovals);
        deployedWallets.push(address(wallet));
        emit WalletCreated(address(wallet), owners, requiredApprovals);
    }

    function getWallets() external view returns (address[] memory) {
        return deployedWallets;
    }
}
