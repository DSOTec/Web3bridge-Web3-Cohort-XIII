import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    
    const whaleAddress = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    await helpers.impersonateAccount(whaleAddress);
    const signer = await ethers.getSigner(whaleAddress);

  
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

   
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
    const dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
    const router = await ethers.getContractAt("contracts/interface/IUniswapV2Router02.sol:IUniswapV2Router02", UNISWAP_V2_ROUTER) as any;
    const factory = await ethers.getContractAt("IUniswapV2Factory", UNISWAP_V2_FACTORY);

    console.log("=== REMOVE LIQUIDITY DEMO ===");
    console.log("Removing liquidity from USDC/DAI pair");

    
    console.log("\n--- Step 1: Adding Initial Liquidity ---");
    
    const usdcAmount = ethers.parseUnits("1000", 6); // 1000 USDC
    const daiAmount = ethers.parseUnits("1000", 18); // 1000 DAI
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    
    await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, usdcAmount);
    await dai.connect(signer).approve(UNISWAP_V2_ROUTER, daiAmount);

  
    const addLiquidityTx = await router.connect(signer).addLiquidity(
        USDC_ADDRESS,
        DAI_ADDRESS,
        usdcAmount,
        daiAmount,
        ethers.parseUnits("950", 6), 
        ethers.parseUnits("950", 18), 
        whaleAddress,
        deadline
    );
    await addLiquidityTx.wait();
    console.log(`Liquidity added. Transaction: ${addLiquidityTx.hash}`);

    
    const pairAddress = await factory.getPair(USDC_ADDRESS, DAI_ADDRESS);
    const pair = await ethers.getContractAt("IERC20", pairAddress);
    
    console.log(`Pair address: ${pairAddress}`);

    console.log("\n=== INITIAL BALANCES ===");
    const initialUSDCBalance = await usdc.balanceOf(whaleAddress);
    const initialDAIBalance = await dai.balanceOf(whaleAddress);
    const initialLPBalance = await pair.balanceOf(whaleAddress);
    
    console.log(`USDC Balance: ${ethers.formatUnits(initialUSDCBalance, 6)} USDC`);
    console.log(`DAI Balance: ${ethers.formatUnits(initialDAIBalance, 18)} DAI`);
    console.log(`LP Token Balance: ${ethers.formatEther(initialLPBalance)} LP tokens`);


    console.log("\n--- Step 2: Removing Liquidity ---");
    
    const liquidityToRemove = initialLPBalance / 2n;
    const minUSDCAmount = ethers.parseUnits("450", 6); 
    const minDAIAmount = ethers.parseUnits("450", 18); 
    
    console.log(`LP tokens to remove: ${ethers.formatEther(liquidityToRemove)}`);
    console.log(`Minimum USDC expected: ${ethers.formatUnits(minUSDCAmount, 6)} USDC`);
    console.log(`Minimum DAI expected: ${ethers.formatUnits(minDAIAmount, 18)} DAI`);

    // Approve LP tokens for removal
    await pair.connect(signer).approve(UNISWAP_V2_ROUTER, liquidityToRemove);
    console.log("LP tokens approved for removal");

    // Execute removeLiquidity
    try {
        const removeLiquidityTx = await router.connect(signer).removeLiquidity(
            USDC_ADDRESS,          // tokenA
            DAI_ADDRESS,           // tokenB  
            liquidityToRemove,     // liquidity amount to remove
            minUSDCAmount,         // amountAMin
            minDAIAmount,          // amountBMin
            whaleAddress,          // to (recipient)
            deadline               // deadline
        );

        const receipt = await removeLiquidityTx.wait();
        console.log(`Remove Liquidity Transaction Hash: ${removeLiquidityTx.hash}`);
        console.log(`Gas Used: ${receipt?.gasUsed.toString()}`);

        // Parse events to get actual amounts received
        const liquidityAddedEvent = receipt?.logs.find((log: any) => {
            try {
                const parsed = router.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                return parsed?.name === "LiquidityRemoved";
            } catch {
                return false;
            }
        });

        if (removeLiquidityEvent) {
            const parsed = router.interface.parseLog({
                topics: removeLiquidityEvent.topics,
                data: removeLiquidityEvent.data
            });
            console.log(`Actual USDC received: ${ethers.formatUnits(parsed?.args[1], 6)} USDC`);
            console.log(`Actual DAI received: ${ethers.formatUnits(parsed?.args[2], 18)} DAI`);
        }

    } catch (error) {
        console.error("Error removing liquidity:", error);
        return;
    }

    // Step 3: Check final balances
    console.log("\n=== FINAL BALANCES ===");
    const finalUSDCBalance = await usdc.balanceOf(whaleAddress);
    const finalDAIBalance = await dai.balanceOf(whaleAddress);
    const finalLPBalance = await pair.balanceOf(whaleAddress);
    
    console.log(`USDC Balance: ${ethers.formatUnits(finalUSDCBalance, 6)} USDC`);
    console.log(`DAI Balance: ${ethers.formatUnits(finalDAIBalance, 18)} DAI`);
    console.log(`LP Token Balance: ${ethers.formatEther(finalLPBalance)} LP tokens`);

    // Calculate differences
    const usdcDiff = finalUSDCBalance - initialUSDCBalance;
    const daiDiff = finalDAIBalance - initialDAIBalance;
    const lpDiff = initialLPBalance - finalLPBalance;
    
    console.log("\n=== BALANCE CHANGES ===");
    console.log(`USDC Received: ${ethers.formatUnits(usdcDiff, 6)} USDC`);
    console.log(`DAI Received: ${ethers.formatUnits(daiDiff, 18)} DAI`);
    console.log(`LP Tokens Burned: ${ethers.formatEther(lpDiff)} LP tokens`);

    // Get pair reserves for additional info
    try {
        const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress);
        const reserves = await pairContract.getReserves();
        const token0 = await pairContract.token0();
        
        if (token0.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
            console.log(`\nPair Reserves After:`);
            console.log(`USDC Reserve: ${ethers.formatUnits(reserves[0], 6)} USDC`);
            console.log(`DAI Reserve: ${ethers.formatUnits(reserves[1], 18)} DAI`);
        } else {
            console.log(`\nPair Reserves After:`);
            console.log(`DAI Reserve: ${ethers.formatUnits(reserves[0], 18)} DAI`);
            console.log(`USDC Reserve: ${ethers.formatUnits(reserves[1], 6)} USDC`);
        }
    } catch (error) {
        console.log("Could not fetch pair reserves");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
