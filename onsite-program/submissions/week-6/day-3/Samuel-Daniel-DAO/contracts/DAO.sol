// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IRoleNFT.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DAO is Ownable {
    IRoleNFT public roleNFT;

    struct Proposal{
        string description;
        uint256 votes;
        bool executed;
    }
    struct RoleRequest{
        address requester;
        string role;
        bool approved;
    }

    Proposal[] public proposals;
    RoleRequest[] public roleRequests;


    constructor(address _roleNFT) Ownable(msg.sender) {
        roleNFT = IRoleNFT(_roleNFT);
    }

    modifier onlyRole(string memory role) {
        require(roleNFT.hasRole(msg.sender, role), "Access denied: missing");
        _;
    }
    function createProposal(string memory description) external onlyRole("proposer") {
        proposals.push(Proposal(description, 0, false));
    }

    function vote(uint256 proposalId) external onlyRole("voter") {
        require(proposalId < proposals.length, "Invalid proposal");
        proposals[proposalId].votes++;
    }

    function executeProposal(uint256 proposalId) external onlyRole("executor") {
        Proposal storage proposal = proposals[proposalId];
        require(!proposal.executed, "Already executed");
        require(proposal.votes > 0, "Not enough votes");
        proposal.executed = true;
        // DAO logic here
    }
    function requestRole(string memory role) external {
        roleRequests.push(RoleRequest(msg.sender, role, false));
    }

    function approveRoleRequest(uint256 requestId, uint256 tokenId, uint256 duration) external onlyRole("approver") {
        RoleRequest storage req = roleRequests[requestId];
        require(!req.approved, "Already approved");
        
        // Assign the role directly (simplified approach)
        roleNFT.assignRole(tokenId, req.role, duration);
        req.approved = true;
    }

    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }
}
