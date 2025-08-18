import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    // Whale address with significant token balances
    const whaleAddress = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    await helpers.impersonateAccount(whaleAddress);
    const signer = await ethers.getSigner(whaleAddress);

    // Contract addresses on Ethereum mainnet
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    // Get contract instances
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
    const router = await ethers.getContractAt("contracts/interface/IUniswapV2Router02.sol:IUniswapV2Router02", UNISWAP_V2_ROUTER) as any;

    console.log("=== SWAP EXACT TOKENS FOR TOKENS DEMO ===");
    console.log("Swapping USDC for DAI");

    // Check initial balances
    console.log("\n=== INITIAL BALANCES ===");
    const initialUSDCBalance = await usdc.balanceOf(whaleAddress);
    const initialDAIBalance = await dai.balanceOf(whaleAddress);
    
    console.log(`USDC Balance: ${ethers.formatUnits(initialUSDCBalance, 6)} USDC`);
    console.log(`DAI Balance: ${ethers.formatUnits(initialDAIBalance, 18)} DAI`);

    // Swap parameters
    const amountIn = ethers.parseUnits("1000", 6); // 1000 USDC to swap
    const path = [USDC_ADDRESS, DAI_ADDRESS]; // Direct USDC -> DAI swap
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

    console.log("\n=== SWAP PARAMETERS ===");
    console.log(`Amount In: ${ethers.formatUnits(amountIn, 6)} USDC`);
    console.log(`Swap Path: USDC -> DAI`);

    // Get expected output amount before swap
    try {
        const amountsOut = await router.getAmountsOut(amountIn, path);
        const expectedDAIOut = amountsOut[1];
        console.log(`Expected DAI Out: ${ethers.formatUnits(expectedDAIOut, 18)} DAI`);
        
        // Set minimum output with 2% slippage
        const amountOutMin = (expectedDAIOut * 98n) / 100n; // 2% slippage tolerance
        console.log(`Minimum DAI Out (2% slippage): ${ethers.formatUnits(amountOutMin, 18)} DAI`);

        // Step 1: Approve USDC spending
        console.log("\n--- Step 1: Approving USDC ---");
        const approveTx = await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, amountIn);
        await approveTx.wait();
        console.log(`USDC Approval Transaction Hash: ${approveTx.hash}`);

        // Step 2: Execute swap
        console.log("\n--- Step 2: Executing Swap ---");
        const swapTx = await router.connect(signer).swapExactTokensForTokens(
            amountIn,           // amountIn
            amountOutMin,       // amountOutMin
            path,               // path
            whaleAddress,       // to
            deadline            // deadline
        );

        const receipt = await swapTx.wait();
        console.log(`Swap Transaction Hash: ${swapTx.hash}`);
        console.log(`Gas Used: ${receipt?.gasUsed.toString()}`);

        // Parse swap event to get actual amounts
        const swapEvent = receipt?.logs.find(log => {
            try {
                const parsed = router.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                return parsed?.name === "Swap";
            } catch {
                return false;
            }
        });

        if (swapEvent) {
            const parsed = router.interface.parseLog({
                topics: swapEvent.topics,
                data: swapEvent.data
            });
            console.log(`Actual amounts: [${parsed?.args.map((amt: any) => amt.toString()).join(', ')}]`);
        }

    } catch (error) {
        console.error("Error executing swap:", error);
        return;
    }

    // Step 3: Check final balances
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
    
    // Calculate effective exchange rate
    if (usdcUsed > 0n) {
        const exchangeRate = (daiReceived * ethers.parseUnits("1", 6)) / usdcUsed;
        console.log(`Exchange Rate: 1 USDC = ${ethers.formatUnits(exchangeRate, 18)} DAI`);
    }

    // Demonstrate multi-hop swap (USDC -> WETH -> DAI)
    console.log("\n=== MULTI-HOP SWAP DEMO ===");
    console.log("Swapping USDC -> WETH -> DAI");
    
    const multiHopAmount = ethers.parseUnits("500", 6); // 500 USDC
    const multiHopPath = [USDC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS];
    
    try {
        const multiHopAmountsOut = await router.getAmountsOut(multiHopAmount, multiHopPath);
        console.log(`Expected output for multi-hop: ${ethers.formatUnits(multiHopAmountsOut[2], 18)} DAI`);
        
        const multiHopAmountOutMin = (multiHopAmountsOut[2] * 95n) / 100n; // 5% slippage
        
        // Approve and execute multi-hop swap
        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, multiHopAmount);
        
        const multiHopSwapTx = await router.connect(signer).swapExactTokensForTokens(
            multiHopAmount,
            multiHopAmountOutMin,
            multiHopPath,
            whaleAddress,
            deadline
        );
        
        await multiHopSwapTx.wait();
        console.log(`Multi-hop Swap Transaction Hash: ${multiHopSwapTx.hash}`);
        
        // Check balances after multi-hop swap
        const finalUSDCAfterMultiHop = await usdc.balanceOf(whaleAddress);
        const finalDAIAfterMultiHop = await dai.balanceOf(whaleAddress);
        
        const additionalUSDCUsed = finalUSDCBalance - finalUSDCAfterMultiHop;
        const additionalDAIReceived = finalDAIAfterMultiHop - finalDAIBalance;
        
        console.log(`Additional USDC Used: ${ethers.formatUnits(additionalUSDCUsed, 6)} USDC`);
        console.log(`Additional DAI Received: ${ethers.formatUnits(additionalDAIReceived, 18)} DAI`);
        
    } catch (error) {
        console.error("Error executing multi-hop swap:", error);
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
