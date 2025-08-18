import { expect } from "chai";
import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Uniswap V2 addLiquidityETH Fork Test", function () {
    let signer: any;
    let usdc: any;
    let router: any;
    
    const WHALE_ADDRESS = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    beforeEach(async function () {
        // Impersonate whale account
        await helpers.impersonateAccount(WHALE_ADDRESS);
        signer = await ethers.getSigner(WHALE_ADDRESS);

        // Get contract instances
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
    });

    it("Should successfully add liquidity ETH to USDC/ETH pair", async function () {
        // Parameters
        const tokenAmount = ethers.parseUnits("1000", 6); // 1000 USDC
        const ethAmount = ethers.parseEther("0.5"); // 0.5 ETH
        const tokenAmountMin = ethers.parseUnits("950", 6); // 5% slippage
        const ethAmountMin = ethers.parseEther("0.475"); // 5% slippage
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Get initial balances
        const initialETHBalance = await ethers.provider.getBalance(WHALE_ADDRESS);
        const initialUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);

        // Approve USDC
        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, tokenAmount);

        // Add liquidity ETH
        const tx = await router.connect(signer).addLiquidityETH(
            USDC_ADDRESS,
            tokenAmount,
            tokenAmountMin,
            ethAmountMin,
            WHALE_ADDRESS,
            deadline,
            { value: ethAmount }
        );

        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);

        // Check balances changed
        const finalETHBalance = await ethers.provider.getBalance(WHALE_ADDRESS);
        const finalUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);

        expect(finalETHBalance).to.be.lt(initialETHBalance);
        expect(finalUSDCBalance).to.be.lt(initialUSDCBalance);
    });

    it("Should revert if insufficient token allowance", async function () {
        const tokenAmount = ethers.parseUnits("1000", 6);
        const ethAmount = ethers.parseEther("0.5");
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Don't approve tokens
        await expect(
            router.connect(signer).addLiquidityETH(
                USDC_ADDRESS,
                tokenAmount,
                tokenAmount,
                ethAmount,
                WHALE_ADDRESS,
                deadline,
                { value: ethAmount }
            )
        ).to.be.reverted;
    });

    it("Should revert if deadline has passed", async function () {
        const tokenAmount = ethers.parseUnits("1000", 6);
        const ethAmount = ethers.parseEther("0.5");
        const pastDeadline = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, tokenAmount);

        await expect(
            router.connect(signer).addLiquidityETH(
                USDC_ADDRESS,
                tokenAmount,
                tokenAmount,
                ethAmount,
                WHALE_ADDRESS,
                pastDeadline,
                { value: ethAmount }
            )
        ).to.be.revertedWith("UniswapV2Router: EXPIRED");
    });
});
