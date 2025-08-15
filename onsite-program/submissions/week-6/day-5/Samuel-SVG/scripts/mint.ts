import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Minting with account:", deployer.address);

    const contractAddress = "0xF0BcD0ce2e676386484010315A26Cbd8E465d435";
    const nft = await ethers.getContractAt("ClockNFT", contractAddress);

    // Get the current token counter
    const tokenCounter = await nft.tokenCounter();
    console.log(`Current token counter: ${tokenCounter}`);

    console.log("Minting new NFT...");
    const tx = await nft.mint();
    const receipt = await tx.wait();
    
    // Get the token ID (should be the same as the old token counter)
    const tokenId = tokenCounter;
    console.log(`Minted NFT!`);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log(`Token ID: ${tokenId}`);
    
    // Get the token URI
    const tokenURI = await nft.tokenURI(tokenId);
    console.log(`\nToken URI (first 100 chars): ${tokenURI.substring(0, 100)}...`);
    
    // Decode the base64 token URI to see the metadata
    try {
        const base64Data = tokenURI.split(",")[1];
        const metadata = Buffer.from(base64Data, 'base64').toString('utf-8');
        console.log("\nDecoded Metadata:");
        console.log(JSON.stringify(JSON.parse(metadata), null, 2));
    } catch (error) {
        console.error("Error decoding metadata:", error);
    }
    
    console.log(`\nView your NFT on Rarible: https://testnet.rarible.com/collection/sepolia/${contractAddress}/token/${tokenId}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});