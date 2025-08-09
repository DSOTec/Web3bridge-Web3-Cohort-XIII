// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {MyToken} from "./ERC20.sol";
import {MyNft} from "./ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract EventTicketing is Ownable {
    MyToken public paymentToken;
    MyNft public ticketToken;
    uint256 public nextTokenId;

    event TicketPurchased(address indexed buyer, uint256 indexed tokenId);

    constructor(MyToken _paymentToken, MyNft _ticketToken, address initialOwner)
    Ownable(initialOwner)
    {
        paymentToken = _paymentToken;
        ticketToken = _ticketToken;
        nextTokenId = 1; // Start token IDs from 1
    }

    function purchaseTicket() external {
        uint256 ticketPrice = 1 * 10 ** 18; // 1 token with 18 decimals
        require(paymentToken.balanceOf(msg.sender) >= ticketPrice, "Insufficient balance");
        require(paymentToken.allowance(msg.sender, address(this)) >= ticketPrice, "Insufficient allowance");

        // Transfer payment to the contract
        paymentToken.transferFrom(msg.sender, address(this), ticketPrice);

        // Mint NFT ticket to the buyer
        uint256 tokenId = nextTokenId++;
        ticketToken.safeMint(msg.sender, tokenId);

        emit TicketPurchased(msg.sender, tokenId);
    }

    function withdrawFunds() external onlyOwner {
        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "No funds to withdraw");
        paymentToken.transfer(msg.sender, balance);
    }
}