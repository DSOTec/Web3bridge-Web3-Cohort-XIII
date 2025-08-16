import { ethers } from "hardhat";
import { Base64 } from "js-base64";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Minting with account:", deployer.address);

    // Get contract address from command line arguments or use default
    const contractAddress = process.env.CONTRACT_ADDRESS || "0x1c64C879Cc26d3Ef677c1aE21D10d6540c8478D0";
    console.log(`Using contract address: ${contractAddress}`);
    
    const nft = await ethers.getContractAt("ClockNFT", contractAddress);

    console.log("Minting new NFT...");
    const tx = await nft.mint();
    console.log(`Transaction sent: ${tx.hash}`);
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);
    
    // Get the token ID from the Transfer event
    const transferEvent = receipt.events?.find((e: any) => e.event === 'Transfer');
    if (!transferEvent) {
        throw new Error('Transfer event not found in transaction receipt');
    }
    
    const tokenId = transferEvent.args?.tokenId;
    console.log(`Successfully minted NFT!`);
    console.log(`Token ID: ${tokenId.toString()}`);
    console.log(`Block number: ${receipt.blockNumber}`);
    
    // Get the token URI
    console.log("\nFetching token metadata...");
    const tokenURI = await nft.tokenURI(tokenId);
    
    try {
        // Extract base64 data from the URI
        const base64Data = tokenURI.split(",")[1];
        if (!base64Data) {
            throw new Error('Invalid token URI format');
        }
        // Decode the base64 data
        const jsonString = Buffer.from(base64Data, 'base64').toString('utf-8');
        const metadata = JSON.parse(jsonString);
        
        console.log("Token Metadata:");
        console.log(`Name: ${metadata.name}`);
        console.log(`Description: ${metadata.description}`);
        
        // Format the minted timestamp
        if (metadata.attributes && metadata.attributes.length > 0) {
            const mintTimestamp = parseInt(metadata.attributes[0].value) * 1000; // Convert to milliseconds
            const mintDate = new Date(mintTimestamp).toLocaleString();
            console.log(`Minted at: ${mintDate}`);
        }
        
        console.log(" View your NFT on a testnet explorer:");
        console.log(`https://mumbai.polygonscan.com/token/${contractAddress}?a=${tokenId.toString()}`);
        
        console.log("Raw Metadata:");
        console.log(JSON.stringify(metadata, null, 2));
        
    } catch (error) {
        console.error(" Error processing token metadata:", error);
        console.log("Raw Token URI (first 200 chars):", tokenURI.substring(0, 200));
    }
    
    console.log(`View your NFT on Rarible: https://sepolia.etherscan.io/token/${contractAddress}/instance/${tokenId}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});