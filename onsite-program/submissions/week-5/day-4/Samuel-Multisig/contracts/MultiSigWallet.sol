// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MultiSigWallet {
    address[] public owners;
    uint public requiredApprovals;

    struct Transaction {
        address to;
        uint value;
        bool executed;
        uint approvalCount;
        mapping(address => bool) approvals;
    }

    Transaction[] public transactions;
    mapping(address => bool) public isOwner;

    modifier onlyOwner() {
        require(isOwner[msg.sender], "Not an owner");
        _;
    }

    constructor(address[] memory _owners, uint _requiredApprovals) {
        require(_owners.length >= _requiredApprovals, "Invalid approvals");
        require(_requiredApprovals >= 3, "Minimum 3 approvals required");

        for (uint i = 0; i < _owners.length; i++) {
            address owner = _owners[i];
            require(owner != address(0), "Zero address");
            require(!isOwner[owner], "Duplicate owner");

            isOwner[owner] = true;
            owners.push(owner);
        }

        requiredApprovals = _requiredApprovals;
    }

    function submitTransaction(address to, uint value) external onlyOwner {
        Transaction storage txn = transactions.push();
        txn.to = to;
        txn.value = value;
        txn.executed = false;
        txn.approvalCount = 0;
    }

    function approveTransaction(uint txIndex) external onlyOwner {
        Transaction storage txn = transactions[txIndex];
        require(!txn.executed, "Already executed");
        require(!txn.approvals[msg.sender], "Already approved");

        txn.approvals[msg.sender] = true;
        txn.approvalCount++;

        if (txn.approvalCount >= requiredApprovals) {
            executeTransaction(txIndex);
        }
    }

    function executeTransaction(uint txIndex) internal {
        Transaction storage txn = transactions[txIndex];
        require(!txn.executed, "Already executed");
        require(txn.approvalCount >= requiredApprovals, "Not enough approvals");

        txn.executed = true;
        (bool success, ) = txn.to.call{value: txn.value}("");
        require(success, "Transfer failed");
    }

    receive() external payable {}
}
