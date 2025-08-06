import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  // Replace with your deployed contract address
  const contractAddress = "0xYourContractAddressHere";

  const nftContract = await ethers.getContractAt("YourContractName", contractAddress);

  // Replace with recipient and metadata URI
  const recipient = "0xRecipientAddressHere";
  const tokenURI = "ipfs://yourMetadataURI";

  const tx = await nftContract.mint(recipient, tokenURI);
  console.log(`Minting... Transaction hash: ${tx.hash}`);

  const receipt = await tx.wait();
  console.log(`NFT minted! Block number: ${receipt.blockNumber}`);
}

main().catch((error) => {
  console.error("Error minting NFT:", error);
  process.exitCode = 1;
});
