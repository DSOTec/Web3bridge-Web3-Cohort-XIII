import { ethers } from "hardhat";
import { IERC20, IUniswapV2Router02, IUniswapV2Factory } from "../typechain-types";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

async function main() {
 
    const whaleAddress = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    await helpers.impersonateAccount(whaleAddress);
    const signer = await ethers.getSigner(whaleAddress);

 
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS) as IERC20;
    const router = await ethers.getContractAt("contracts/interface/IUniswapV2Router02.sol:IUniswapV2Router02", UNISWAP_V2_ROUTER) as unknown as IUniswapV2Router02;

    console.log("=== INITIAL BALANCES ===");
    const initialETHBalance = await ethers.provider.getBalance(whaleAddress);
    const initialUSDCBalance = await usdc.balanceOf(whaleAddress);
    
    console.log(`ETH Balance: ${ethers.formatEther(initialETHBalance)} ETH`);
    console.log(`USDC Balance: ${ethers.formatUnits(initialUSDCBalance, 6)} USDC`);

    // Parameters for addLiquidityETH - adjusted for current ETH price (~$3500)
    const tokenAmount = ethers.parseUnits("1750", 6); // 1750 USDC
    const ethAmount = ethers.parseEther("0.5"); // 0.5 ETH
    const tokenAmountMin = ethers.parseUnits("1400", 6); // Minimum 1400 USDC (20% slippage)
    const ethAmountMin = ethers.parseEther("0.4"); // Minimum 0.4 ETH (20% slippage)
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now

    console.log("\n=== ADDING LIQUIDITY ETH ===");
    console.log(`Token (USDC): ${ethers.formatUnits(tokenAmount, 6)} USDC`);
    console.log(`ETH: ${ethers.formatEther(ethAmount)} ETH`);
    console.log(`Minimum Token: ${ethers.formatUnits(tokenAmountMin, 6)} USDC`);
    console.log(`Minimum ETH: ${ethers.formatEther(ethAmountMin)} ETH`);

  
    console.log("\n--- Step 1: Approving USDC ---");
    const approveTx = await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, tokenAmount);
    await approveTx.wait();
    console.log(`USDC Approval Transaction Hash: ${approveTx.hash}`);

    // Step 2: Add liquidity ETH
    console.log("\n--- Step 2: Adding Liquidity ETH ---");
    try {
        const addLiquidityTx = await router.connect(signer).addLiquidityETH(
            USDC_ADDRESS,           // token address
            tokenAmount,            // amountTokenDesired
            tokenAmountMin,         // amountTokenMin
            ethAmountMin,           // amountETHMin
            whaleAddress,           // to (recipient of LP tokens)
            deadline,               // deadline
            { value: ethAmount }    // ETH amount to send
        );

        const receipt = await addLiquidityTx.wait();
        console.log(`Add Liquidity ETH Transaction Hash: ${addLiquidityTx.hash}`);
        console.log(`Gas Used: ${receipt?.gasUsed.toString()}`);

        // Parse the event logs to get the actual amounts
        const liquidityAddedEvent = receipt?.logs.find((log: any) => {
            try {
                const parsed = router.interface.parseLog({
                    topics: log.topics,
                    data: log.data
                });
                return parsed?.name === "LiquidityAdded";
            } catch {
                return false;
            }
        });

        if (liquidityAddedEvent) {
            const parsed = router.interface.parseLog({
                topics: liquidityAddedEvent.topics,
                data: liquidityAddedEvent.data
            });
            console.log(`Actual Token Amount Added: ${ethers.formatUnits(parsed?.args[1], 6)} USDC`);
            console.log(`Actual ETH Amount Added: ${ethers.formatEther(parsed?.args[2])} ETH`);
            console.log(`LP Tokens Received: ${parsed?.args[3].toString()}`);
        }

    } catch (error) {
        console.error("Error adding liquidity:", error);
        return;
    }

    // Step 3: Check final balances
    console.log("\n=== FINAL BALANCES ===");
    const finalETHBalance = await ethers.provider.getBalance(whaleAddress);
    const finalUSDCBalance = await usdc.balanceOf(whaleAddress);
    
    console.log(`ETH Balance: ${ethers.formatEther(finalETHBalance)} ETH`);
    console.log(`USDC Balance: ${ethers.formatUnits(finalUSDCBalance, 6)} USDC`);

    // Calculate differences
    const ethDiff = initialETHBalance - finalETHBalance;
    const usdcDiff = initialUSDCBalance - finalUSDCBalance;
    
    console.log("\n=== BALANCE CHANGES ===");
    console.log(`ETH Used: ${ethers.formatEther(ethDiff)} ETH`);
    console.log(`USDC Used: ${ethers.formatUnits(usdcDiff, 6)} USDC`);

    // Get LP token balance (optional)
    try {
        const pairFactory = await ethers.getContractAt("IUniswapV2Factory", await router.factory()) as IUniswapV2Factory;
        const pairAddress = await pairFactory.getPair(USDC_ADDRESS, WETH_ADDRESS);
        
        if (pairAddress !== ethers.ZeroAddress) {
            const pair = await ethers.getContractAt("IERC20", pairAddress);
            const lpBalance = await pair.balanceOf(whaleAddress);
            console.log(`LP Token Balance: ${ethers.formatEther(lpBalance)} LP tokens`);
        }
    } catch (error) {
        console.log("Could not fetch LP token balance");
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
