// SPDX-License-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ERC20.sol";
import "../src/ERC721.sol";
import "../src/EventTicketing.sol";

contract EventTicketingTest is Test {
    MyToken public paymentToken;
    MyNft public ticketToken;
    EventTicketing public ticketing;
    address public owner = address(0x1);
    address public user1 = address(0x2);
    address public user2 = address(0x3);
    uint256 public ticketPrice = 1 * 10 ** 18;

    event TicketPurchased(address indexed buyer, uint256 indexed tokenId);

    function setUp() public {
        // Deploy contracts
        vm.startPrank(owner);
        paymentToken = new MyToken(owner);
        // Mint initial tokens to owner
        paymentToken.mint(owner, 1000 * 10 ** 18);
        ticketToken = new MyNft(owner);
        ticketing = new EventTicketing(paymentToken, ticketToken, owner);

        // Set the ticketing contract as a minter in the NFT contract
        ticketToken.grantRole(ticketToken.MINTER_ROLE(), address(ticketing));

        vm.stopPrank();

        // Transfer tokens to users for testing
        vm.startPrank(owner);
        paymentToken.transfer(user1, 100 * 10 ** 18);
        paymentToken.transfer(user2, 100 * 10 ** 18);
        vm.stopPrank();
    }

    function test_Deploy() public view {
        assertEq(address(ticketing.paymentToken()), address(paymentToken), "Payment token not set correctly");
        //  assertEq(address(ticketing.ticketToken()), address(ticketToken), "Ticket token not set correctly");
        //  assertEq(ticketToken.setTicketingContract(address(ticketing)));
        assertEq(ticketing.owner(), owner, "Owner not set correctly");
        assertEq(ticketing.nextTokenId(), 1, "Next token ID not initialized to 1");
    }

    function test_PurchaseTicket_Success() public {
        // Get initial balances
        uint256 user1InitialBalance = paymentToken.balanceOf(user1);
        uint256 contractInitialBalance = paymentToken.balanceOf(address(ticketing));

        // Start the purchase transaction
        vm.startPrank(user1);
        paymentToken.approve(address(ticketing), ticketPrice);

        // Expect the TicketPurchased event
        vm.expectEmit(true, true, false, true);
        emit TicketPurchased(user1, 1);

        // Execute the purchase
        ticketing.purchaseTicket();
        vm.stopPrank();

        // Verify the results
        assertEq(paymentToken.balanceOf(user1), user1InitialBalance - ticketPrice, "User1 balance not deducted correctly");
        assertEq(paymentToken.balanceOf(address(ticketing)), contractInitialBalance + ticketPrice, "Contract balance not updated");
        assertEq(ticketToken.ownerOf(1), user1, "NFT not minted to user1");
        assertEq(ticketing.nextTokenId(), 2, "Next token ID not incremented");
    }

    function test_PurchaseTicket_InsufficientBalance() public {
        address poorUser = address(0x4);
        // Give the user just enough to approve but not enough to buy
        vm.startPrank(owner);
        paymentToken.transfer(poorUser, 0.5 * 10 ** 18);
        vm.stopPrank();

        vm.startPrank(poorUser);
        paymentToken.approve(address(ticketing), ticketPrice);

        // Should fail with insufficient balance
        vm.expectRevert("Insufficient balance");
        ticketing.purchaseTicket();
        vm.stopPrank();
    }

    function test_PurchaseTicket_InsufficientAllowance() public {
        vm.startPrank(user1);
        // No approval set
        vm.expectRevert("Insufficient allowance");
        ticketing.purchaseTicket();
        vm.stopPrank();
    }

    function test_WithdrawFunds_Success() public {
        // Purchase a ticket to add funds
        vm.startPrank(user1);
        paymentToken.approve(address(ticketing), ticketPrice);
        ticketing.purchaseTicket();
        vm.stopPrank();

        uint256 contractBalance = paymentToken.balanceOf(address(ticketing));
        uint256 ownerBalanceBefore = paymentToken.balanceOf(owner);

        // Withdraw funds as owner
        vm.startPrank(owner);

        // We're not checking for events here since the contract doesn't emit any
        // for the withdrawFunds function
        ticketing.withdrawFunds();

        uint256 ownerBalanceAfter = paymentToken.balanceOf(owner);

        assertEq(ownerBalanceAfter - ownerBalanceBefore, ticketPrice, "Owner did not receive funds");
        assertEq(paymentToken.balanceOf(address(ticketing)), 0, "Contract balance not zeroed");
        vm.stopPrank();
    }

    // Event declaration for Withdrawn
    event Withdrawn(address indexed to, uint256 amount);

    function test_WithdrawFunds_NonOwner() public {
        // Purchase a ticket to add funds
        vm.startPrank(user1);
        paymentToken.approve(address(ticketing), ticketPrice);
        ticketing.purchaseTicket();
        vm.stopPrank();

        // Non-owner tries to withdraw
        vm.startPrank(user2);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", user2));
        ticketing.withdrawFunds();
        vm.stopPrank();
    }

    function test_WithdrawFunds_NoBalance() public {
        vm.startPrank(owner);
        vm.expectRevert("No funds to withdraw");
        ticketing.withdrawFunds();
        vm.stopPrank();
    }
}