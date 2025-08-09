// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {EventTicketing} from "../src/EventTicketing.sol";
import {MyToken} from "../src/ERC20.sol";
import {MyNft} from "../src/ERC721.sol";

contract DeployEventTicketing is Script {
    function run() external {
        // Get the private key from the environment variable
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.rememberKey(deployerPrivateKey);
        
        // Create deployments directory if it doesn't exist (using inline bash)
        string[] memory mkdirCmd = new string[](3);
        mkdirCmd[0] = "bash";
        mkdirCmd[1] = "-c";
        mkdirCmd[2] = "mkdir -p deployments";
        vm.ffi(mkdirCmd);
        
        // Start broadcasting transactions
        vm.startBroadcast(deployer);
        
        // 1. Deploy the payment token (ERC20)
        MyToken paymentToken = new MyToken(deployer);
        console.log("Payment Token deployed at:", address(paymentToken));
        
        // 2. Deploy the ticket token (ERC721)
        MyNft ticketToken = new MyNft(deployer);
        console.log("Ticket Token deployed at:", address(ticketToken));
        
        // 3. Deploy the EventTicketing contract
        EventTicketing eventTicketing = new EventTicketing(
            paymentToken,
            ticketToken,
            deployer
        );
        console.log("EventTicketing deployed at:", address(eventTicketing));
        
        // 4. Optional: Set up initial tokens for testing
        // Mint some payment tokens to the deployer
        paymentToken.mint(deployer, 1000 * 10**18);
        console.log("Minted 1000 payment tokens to deployer");
        
        vm.stopBroadcast();
        
        // Write the deployed addresses to a JSON file for frontend/other scripts to use
        string memory addresses = string.concat(
            '{\n',
            '  "paymentToken": "', vm.toString(address(paymentToken)), '",\n',
            '  "ticketToken": "', vm.toString(address(ticketToken)), '",\n',
            '  "eventTicketing": "', vm.toString(address(eventTicketing)), '"\n',
            '}'
        );
        
        vm.writeJson(addresses, "./deployments/event-ticketing.json");
        console.log("Deployment addresses saved to deployments/event-ticketing.json");
    }
}
