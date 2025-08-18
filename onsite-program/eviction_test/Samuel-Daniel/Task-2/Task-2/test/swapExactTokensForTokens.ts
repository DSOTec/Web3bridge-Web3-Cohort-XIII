import { expect } from "chai";
import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Uniswap V2 swapExactTokensForTokens Fork Test", function () {
    let signer: any;
    let usdc: any;
    let dai: any;
    let router: any;
    
    const WHALE_ADDRESS = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    beforeEach(async function () {
        // Impersonate whale account
        await helpers.impersonateAccount(WHALE_ADDRESS);
        signer = await ethers.getSigner(WHALE_ADDRESS);

        // Get contract instances
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
        router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
    });

    it("Should successfully swap exact USDC for DAI", async function () {
        // Parameters
        const amountIn = ethers.parseUnits("1000", 6); // 1000 USDC
        const path = [USDC_ADDRESS, DAI_ADDRESS];
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Get expected output
        const amountsOut = await router.getAmountsOut(amountIn, path);
        const expectedDAIOut = amountsOut[1];
        const amountOutMin = (expectedDAIOut * 95n) / 100n; // 5% slippage

        // Get initial balances
        const initialUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);
        const initialDAIBalance = await dai.balanceOf(WHALE_ADDRESS);

        // Approve USDC
        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, amountIn);

        // Execute swap
        const tx = await router.connect(signer).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            WHALE_ADDRESS,
            deadline
        );

        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);

        // Check final balances
        const finalUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);
        const finalDAIBalance = await dai.balanceOf(WHALE_ADDRESS);

        // Verify swap occurred
        expect(finalUSDCBalance).to.be.lt(initialUSDCBalance);
        expect(finalDAIBalance).to.be.gt(initialDAIBalance);

        // Verify exact input amount was used
        const usdcUsed = initialUSDCBalance - finalUSDCBalance;
        expect(usdcUsed).to.equal(amountIn);

        // Verify minimum output was met
        const daiReceived = finalDAIBalance - initialDAIBalance;
        expect(daiReceived).to.be.gte(amountOutMin);
    });

    it("Should successfully execute multi-hop swap USDC -> WETH -> DAI", async function () {
        const amountIn = ethers.parseUnits("500", 6); // 500 USDC
        const path = [USDC_ADDRESS, WETH_ADDRESS, DAI_ADDRESS];
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Get expected output
        const amountsOut = await router.getAmountsOut(amountIn, path);
        const expectedDAIOut = amountsOut[2];
        const amountOutMin = (expectedDAIOut * 95n) / 100n; // 5% slippage

        // Get initial balances
        const initialUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);
        const initialDAIBalance = await dai.balanceOf(WHALE_ADDRESS);

        // Approve USDC
        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, amountIn);

        // Execute multi-hop swap
        const tx = await router.connect(signer).swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            path,
            WHALE_ADDRESS,
            deadline
        );

        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);

        // Check final balances
        const finalUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);
        const finalDAIBalance = await dai.balanceOf(WHALE_ADDRESS);

        // Verify swap occurred
        expect(finalUSDCBalance).to.be.lt(initialUSDCBalance);
        expect(finalDAIBalance).to.be.gt(initialDAIBalance);

        // Verify exact input amount was used
        const usdcUsed = initialUSDCBalance - finalUSDCBalance;
        expect(usdcUsed).to.equal(amountIn);

        // Verify minimum output was met
        const daiReceived = finalDAIBalance - initialDAIBalance;
        expect(daiReceived).to.be.gte(amountOutMin);
    });

    it("Should revert if insufficient token allowance", async function () {
        const amountIn = ethers.parseUnits("1000", 6);
        const path = [USDC_ADDRESS, DAI_ADDRESS];
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Don't approve tokens
        await expect(
            router.connect(signer).swapExactTokensForTokens(
                amountIn,
                0,
                path,
                WHALE_ADDRESS,
                deadline
            )
        ).to.be.reverted;
    });

    it("Should revert if deadline has passed", async function () {
        const amountIn = ethers.parseUnits("1000", 6);
        const path = [USDC_ADDRESS, DAI_ADDRESS];
        const pastDeadline = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, amountIn);

        await expect(
            router.connect(signer).swapExactTokensForTokens(
                amountIn,
                0,
                path,
                WHALE_ADDRESS,
                pastDeadline
            )
        ).to.be.revertedWith("UniswapV2Router: EXPIRED");
    });

    it("Should revert if minimum output amount not met", async function () {
        const amountIn = ethers.parseUnits("1000", 6);
        const path = [USDC_ADDRESS, DAI_ADDRESS];
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Get expected output and set unrealistic minimum
        const amountsOut = await router.getAmountsOut(amountIn, path);
        const expectedDAIOut = amountsOut[1];
        const unrealisticMin = expectedDAIOut * 2n; // 200% of expected output

        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, amountIn);

        await expect(
            router.connect(signer).swapExactTokensForTokens(
                amountIn,
                unrealisticMin,
                path,
                WHALE_ADDRESS,
                deadline
            )
        ).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT");
    });

    it("Should revert with invalid path", async function () {
        const amountIn = ethers.parseUnits("1000", 6);
        const invalidPath = [USDC_ADDRESS]; // Path must have at least 2 tokens
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, amountIn);

        await expect(
            router.connect(signer).swapExactTokensForTokens(
                amountIn,
                0,
                invalidPath,
                WHALE_ADDRESS,
                deadline
            )
        ).to.be.reverted;
    });
});
