import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
 
    const whaleAddress = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    await helpers.impersonateAccount(whaleAddress);
    const signer = await ethers.getSigner(whaleAddress);

 
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
    const router = await ethers.getContractAt("contracts/interface/IUniswapV2Router02.sol:IUniswapV2Router02", UNISWAP_V2_ROUTER) as any;

    console.log("=== SWAP TOKENS FOR EXACT TOKENS DEMO ===");
    console.log("Swapping USDC for exact amount of DAI");

    // Check initial balances
    console.log("\n=== INITIAL BALANCES ===");
    const initialUSDCBalance = await usdc.balanceOf(whaleAddress);
    const initialDAIBalance = await dai.balanceOf(whaleAddress);
    
    console.log(`USDC Balance: ${ethers.formatUnits(initialUSDCBalance, 6)} USDC`);
    console.log(`DAI Balance: ${ethers.formatUnits(initialDAIBalance, 18)} DAI`);

    // Swap parameters
    const amountOut = ethers.parseUnits("500", 18); // Want exactly 500 DAI
    const path = [USDC_ADDRESS, DAI_ADDRESS]; // USDC -> DAI swap
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

    console.log("\n=== SWAP PARAMETERS ===");
    console.log(`Exact DAI Amount Desired: ${ethers.formatUnits(amountOut, 18)} DAI`);
    console.log(`Swap Path: USDC -> DAI`);

    // Get required input amount before swap
    try {
        const amountsIn = await router.getAmountsIn(amountOut, path);
        const requiredUSDCIn = amountsIn[0];
        console.log(`Required USDC In: ${ethers.formatUnits(requiredUSDCIn, 6)} USDC`);
        
        // Set maximum input with 2% slippage
        const amountInMax = (requiredUSDCIn * 102n) / 100n; // 2% slippage tolerance
        console.log(`Maximum USDC In (2% slippage): ${ethers.formatUnits(amountInMax, 6)} USDC`);

        // Step 1: Approve USDC spending (approve max amount)
        console.log("\n--- Step 1: Approving USDC ---");
        const approveTx = await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, amountInMax);
        await approveTx.wait();
        console.log(`USDC Approval Transaction Hash: ${approveTx.hash}`);

        // Step 2: Execute swap
        console.log("\n--- Step 2: Executing Swap for Exact Tokens ---");
        const swapTx = await router.connect(signer).swapTokensForExactTokens(
            amountOut,          // amountOut (exact amount we want)
            amountInMax,        // amountInMax (maximum we're willing to pay)
            path,               // path
            whaleAddress,       // to
            deadline            // deadline
        );

        const receipt = await swapTx.wait();
        console.log(`Swap Transaction Hash: ${swapTx.hash}`);
        console.log(`Gas Used: ${receipt?.gasUsed.toString()}`);

    } catch (error) {
        console.error("Error executing swap:", error);
        return;
    }

    // Check final balances
    console.log("\n=== FINAL BALANCES ===");
    const finalUSDCBalance = await usdc.balanceOf(whaleAddress);
    const finalDAIBalance = await dai.balanceOf(whaleAddress);
    
    console.log(`USDC Balance: ${ethers.formatUnits(finalUSDCBalance, 6)} USDC`);
    console.log(`DAI Balance: ${ethers.formatUnits(finalDAIBalance, 18)} DAI`);

    // Calculate differences
    const usdcUsed = initialUSDCBalance - finalUSDCBalance;
    const daiReceived = finalDAIBalance - initialDAIBalance;
    
    console.log("\n=== SWAP RESULTS ===");
    console.log(`USDC Used: ${ethers.formatUnits(usdcUsed, 6)} USDC`);
    console.log(`DAI Received: ${ethers.formatUnits(daiReceived, 18)} DAI`);
    
    // Verify we got exactly the amount we wanted
    const expectedAmount = ethers.formatUnits(amountOut, 18);
    const actualAmount = ethers.formatUnits(daiReceived, 18);
    console.log(`Expected DAI: ${expectedAmount} DAI`);
    console.log(`Actual DAI: ${actualAmount} DAI`);
    console.log(`Match: ${expectedAmount === actualAmount ? '✅' : '❌'}`);
    
    // Calculate effective exchange rate
    if (usdcUsed > 0n) {
        const exchangeRate = (daiReceived * ethers.parseUnits("1", 6)) / usdcUsed;
        console.log(`Exchange Rate: 1 USDC = ${ethers.formatUnits(exchangeRate, 18)} DAI`);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
