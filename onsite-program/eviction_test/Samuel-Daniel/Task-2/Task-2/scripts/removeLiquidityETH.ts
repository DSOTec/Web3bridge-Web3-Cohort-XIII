import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
    // Whale address with significant balances
    const whaleAddress = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    await helpers.impersonateAccount(whaleAddress);
    const signer = await ethers.getSigner(whaleAddress);

    // Contract addresses on Ethereum mainnet
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    // Get contract instances
    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS) as any;
    const router = await ethers.getContractAt("contracts/interface/IUniswapV2Router02.sol:IUniswapV2Router02", UNISWAP_V2_ROUTER) as any;
    const factory = await ethers.getContractAt("IUniswapV2Factory", UNISWAP_V2_FACTORY) as any;

    console.log("=== REMOVE LIQUIDITY ETH DEMO ===");
    console.log("Removing liquidity from USDC/ETH pair");

    // Step 1: Add initial liquidity to have LP tokens
    console.log("\n--- Step 1: Adding Initial Liquidity ETH ---");
    
    // Use realistic amounts based on current ETH price (~$3500)
    const usdcAmount = ethers.parseUnits("1750", 6); // 1750 USDC
    const ethAmount = ethers.parseEther("0.5"); // 0.5 ETH
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes

    // Approve USDC for adding liquidity
    await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, usdcAmount);

    // Add liquidity ETH to get LP tokens with more generous slippage
    const addLiquidityTx = await router.connect(signer).addLiquidityETH(
        USDC_ADDRESS,
        usdcAmount,
        ethers.parseUnits("1400", 6), // min USDC (20% slippage)
        ethers.parseEther("0.4"), // min ETH (20% slippage)
        whaleAddress,
        deadline,
        { value: ethAmount }
    );
    await addLiquidityTx.wait();
    console.log(`Liquidity ETH added. Transaction: ${addLiquidityTx.hash}`);

    // Get the pair address
    const pairAddress = await factory.getPair(USDC_ADDRESS, WETH_ADDRESS);
    const pair = await ethers.getContractAt("IERC20", pairAddress) as any;
    
    console.log(`USDC/WETH Pair address: ${pairAddress}`);

    // Check initial balances
    console.log("\n=== INITIAL BALANCES ===");
    const initialETHBalance = await ethers.provider.getBalance(whaleAddress);
    const initialUSDCBalance = await usdc.balanceOf(whaleAddress);
    const initialLPBalance = await pair.balanceOf(whaleAddress);
    
    console.log(`ETH Balance: ${ethers.formatEther(initialETHBalance)} ETH`);
    console.log(`USDC Balance: ${ethers.formatUnits(initialUSDCBalance, 6)} USDC`);
    console.log(`LP Token Balance: ${ethers.formatEther(initialLPBalance)} LP tokens`);

    // Step 2: Remove liquidity ETH
    console.log("\n--- Step 2: Removing Liquidity ETH ---");
    
    // Remove 50% of LP tokens
    const liquidityToRemove = initialLPBalance / 2n;
    // Set very low minimums since LP balance is tiny - essentially 0 with high slippage tolerance
    const minUSDCAmount = ethers.parseUnits("0.001", 6); // Minimum 0.001 USDC (very low)
    const minETHAmount = ethers.parseEther("0.000001"); // Minimum 0.000001 ETH (very low)
    
    console.log(`LP tokens to remove: ${ethers.formatEther(liquidityToRemove)}`);
    console.log(`Minimum USDC expected: ${ethers.formatUnits(minUSDCAmount, 6)} USDC`);
    console.log(`Minimum ETH expected: ${ethers.formatEther(minETHAmount)} ETH`);

    // Approve LP tokens for removal
    await pair.connect(signer).approve(UNISWAP_V2_ROUTER, liquidityToRemove);
    console.log("LP tokens approved for removal");

    // Execute removeLiquidityETH
    try {
        const removeLiquidityTx = await router.connect(signer).removeLiquidityETH(
            USDC_ADDRESS,          // token
            liquidityToRemove,     // liquidity amount to remove
            minUSDCAmount,         // amountTokenMin
            minETHAmount,          // amountETHMin
            whaleAddress,          // to (recipient)
            deadline               // deadline
        );

        const receipt = await removeLiquidityTx.wait();
        console.log(`Remove Liquidity ETH Transaction Hash: ${removeLiquidityTx.hash}`);
        console.log(`Gas Used: ${receipt?.gasUsed.toString()}`);

        // Parse events to get actual amounts received
        const removeLiquidityEvent = receipt?.logs.find(log => {
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
            console.log(`Actual ETH received: ${ethers.formatEther(parsed?.args[2])} ETH`);
        }

    } catch (error) {
        console.error("Error removing liquidity ETH:", error);
        return;
    }

    // Step 3: Check final balances
    console.log("\n=== FINAL BALANCES ===");
    const finalETHBalance = await ethers.provider.getBalance(whaleAddress);
    const finalUSDCBalance = await usdc.balanceOf(whaleAddress);
    const finalLPBalance = await pair.balanceOf(whaleAddress);
    
    console.log(`ETH Balance: ${ethers.formatEther(finalETHBalance)} ETH`);
    console.log(`USDC Balance: ${ethers.formatUnits(finalUSDCBalance, 6)} USDC`);
    console.log(`LP Token Balance: ${ethers.formatEther(finalLPBalance)} LP tokens`);

    // Calculate differences
    const ethDiff = finalETHBalance - initialETHBalance;
    const usdcDiff = finalUSDCBalance - initialUSDCBalance;
    const lpDiff = initialLPBalance - finalLPBalance;
    
    console.log("\n=== BALANCE CHANGES ===");
    console.log(`ETH Received: ${ethers.formatEther(ethDiff)} ETH`);
    console.log(`USDC Received: ${ethers.formatUnits(usdcDiff, 6)} USDC`);
    console.log(`LP Tokens Burned: ${ethers.formatEther(lpDiff)} LP tokens`);

    // Get pair reserves for additional info
    try {
        const pairContract = await ethers.getContractAt("IUniswapV2Pair", pairAddress) as any;
        const reserves = await pairContract.getReserves();
        const token0 = await pairContract.token0();
        
        console.log(`\nPair Reserves After:`);
        if (token0.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
            console.log(`USDC Reserve: ${ethers.formatUnits(reserves[0], 6)} USDC`);
            console.log(`WETH Reserve: ${ethers.formatEther(reserves[1])} WETH`);
        } else {
            console.log(`WETH Reserve: ${ethers.formatEther(reserves[0])} WETH`);
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
