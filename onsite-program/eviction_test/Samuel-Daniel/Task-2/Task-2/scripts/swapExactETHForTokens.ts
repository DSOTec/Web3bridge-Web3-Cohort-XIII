import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    // Whale address with significant ETH balance
    const whaleAddress = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    await helpers.impersonateAccount(whaleAddress);
    const signer = await ethers.getSigner(whaleAddress);

    // Contract addresses on Ethereum mainnet
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    // Get contract instances
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const router = await ethers.getContractAt("contracts/interface/IUniswapV2Router02.sol:IUniswapV2Router02", UNISWAP_V2_ROUTER);

    console.log("=== SWAP EXACT ETH FOR TOKENS DEMO ===");
    console.log("Swapping ETH for USDC");

    // Check initial balances
    console.log("\n=== INITIAL BALANCES ===");
    const initialETHBalance = await ethers.provider.getBalance(whaleAddress);
    const initialUSDCBalance = await usdc.balanceOf(whaleAddress);
    
    console.log(`ETH Balance: ${ethers.formatEther(initialETHBalance)} ETH`);
    console.log(`USDC Balance: ${ethers.formatUnits(initialUSDCBalance, 6)} USDC`);

    // Swap parameters
    const ethAmountIn = ethers.parseEther("1.0"); // 1 ETH to swap
    const path = [WETH_ADDRESS, USDC_ADDRESS]; // ETH -> USDC swap
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

    console.log("\n=== SWAP PARAMETERS ===");
    console.log(`ETH Amount In: ${ethers.formatEther(ethAmountIn)} ETH`);
    console.log(`Swap Path: ETH -> USDC`);

    // Get expected output amount before swap
    try {
        const amountsOut = await router.getAmountsOut(ethAmountIn, path);
        const expectedUSDCOut = amountsOut[1];
        console.log(`Expected USDC Out: ${ethers.formatUnits(expectedUSDCOut, 6)} USDC`);
        
        // Set minimum output with 2% slippage
        const amountOutMin = (expectedUSDCOut * 98n) / 100n; // 2% slippage tolerance
        console.log(`Minimum USDC Out (2% slippage): ${ethers.formatUnits(amountOutMin, 6)} USDC`);

        // Execute swap
        console.log("\n--- Executing ETH to USDC Swap ---");
        const swapTx = await router.connect(signer).swapExactETHForTokens(
            amountOutMin,       // amountOutMin
            path,               // path
            whaleAddress,       // to
            deadline,           // deadline
            { value: ethAmountIn } // ETH amount to send
        );

        const receipt = await swapTx.wait();
        console.log(`Swap Transaction Hash: ${swapTx.hash}`);
        console.log(`Gas Used: ${receipt?.gasUsed.toString()}`);

    } catch (error) {
        console.error("Error executing ETH swap:", error);
        return;
    }

    // Check final balances
    console.log("\n=== FINAL BALANCES ===");
    const finalETHBalance = await ethers.provider.getBalance(whaleAddress);
    const finalUSDCBalance = await usdc.balanceOf(whaleAddress);
    
    console.log(`ETH Balance: ${ethers.formatEther(finalETHBalance)} ETH`);
    console.log(`USDC Balance: ${ethers.formatUnits(finalUSDCBalance, 6)} USDC`);

    // Calculate differences
    const ethUsed = initialETHBalance - finalETHBalance;
    const usdcReceived = finalUSDCBalance - initialUSDCBalance;
    
    console.log("\n=== SWAP RESULTS ===");
    console.log(`ETH Used: ${ethers.formatEther(ethUsed)} ETH`);
    console.log(`USDC Received: ${ethers.formatUnits(usdcReceived, 6)} USDC`);
    
    // Calculate effective exchange rate
    if (ethUsed > 0n) {
        const exchangeRate = (usdcReceived * ethers.parseEther("1")) / ethUsed;
        console.log(`Exchange Rate: 1 ETH = ${ethers.formatUnits(exchangeRate, 6)} USDC`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
