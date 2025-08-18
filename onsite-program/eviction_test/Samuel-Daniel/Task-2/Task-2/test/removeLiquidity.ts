import { expect } from "chai";
import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Uniswap V2 removeLiquidity Fork Test", function () {
    let signer: any;
    let usdc: any;
    let dai: any;
    let router: any;
    let factory: any;
    let pair: any;
    
    const WHALE_ADDRESS = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const DAI_ADDRESS = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
    const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";

    beforeEach(async function () {
        // Impersonate whale account
        await helpers.impersonateAccount(WHALE_ADDRESS);
        signer = await ethers.getSigner(WHALE_ADDRESS);

        // Get contract instances
        usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS);
        dai = await ethers.getContractAt("IERC20", DAI_ADDRESS);
        router = await ethers.getContractAt("IUniswapV2Router02", UNISWAP_V2_ROUTER);
        factory = await ethers.getContractAt("IUniswapV2Factory", UNISWAP_V2_FACTORY);

        // Get pair contract
        const pairAddress = await factory.getPair(USDC_ADDRESS, DAI_ADDRESS);
        pair = await ethers.getContractAt("IERC20", pairAddress);

        // Add initial liquidity for testing
        const usdcAmount = ethers.parseUnits("1000", 6);
        const daiAmount = ethers.parseUnits("1000", 18);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        await usdc.connect(signer).approve(UNISWAP_V2_ROUTER, usdcAmount);
        await dai.connect(signer).approve(UNISWAP_V2_ROUTER, daiAmount);

        await router.connect(signer).addLiquidity(
            USDC_ADDRESS,
            DAI_ADDRESS,
            usdcAmount,
            daiAmount,
            ethers.parseUnits("950", 6),
            ethers.parseUnits("950", 18),
            WHALE_ADDRESS,
            deadline
        );
    });

    it("Should successfully remove liquidity from USDC/DAI pair", async function () {
        // Get initial balances
        const initialUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);
        const initialDAIBalance = await dai.balanceOf(WHALE_ADDRESS);
        const initialLPBalance = await pair.balanceOf(WHALE_ADDRESS);

        expect(initialLPBalance).to.be.gt(0);

        // Parameters for removing liquidity
        const liquidityToRemove = initialLPBalance / 2n; // Remove 50%
        const minUSDCAmount = ethers.parseUnits("400", 6); // 10% slippage
        const minDAIAmount = ethers.parseUnits("400", 18); // 10% slippage
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Approve LP tokens
        await pair.connect(signer).approve(UNISWAP_V2_ROUTER, liquidityToRemove);

        // Remove liquidity
        const tx = await router.connect(signer).removeLiquidity(
            USDC_ADDRESS,
            DAI_ADDRESS,
            liquidityToRemove,
            minUSDCAmount,
            minDAIAmount,
            WHALE_ADDRESS,
            deadline
        );

        const receipt = await tx.wait();
        expect(receipt.status).to.equal(1);

        // Check final balances
        const finalUSDCBalance = await usdc.balanceOf(WHALE_ADDRESS);
        const finalDAIBalance = await dai.balanceOf(WHALE_ADDRESS);
        const finalLPBalance = await pair.balanceOf(WHALE_ADDRESS);

        // Verify tokens were received
        expect(finalUSDCBalance).to.be.gt(initialUSDCBalance);
        expect(finalDAIBalance).to.be.gt(initialDAIBalance);
        expect(finalLPBalance).to.be.lt(initialLPBalance);

        // Verify minimum amounts were met
        const usdcReceived = finalUSDCBalance - initialUSDCBalance;
        const daiReceived = finalDAIBalance - initialDAIBalance;
        
        expect(usdcReceived).to.be.gte(minUSDCAmount);
        expect(daiReceived).to.be.gte(minDAIAmount);
    });

    it("Should revert if insufficient LP token allowance", async function () {
        const lpBalance = await pair.balanceOf(WHALE_ADDRESS);
        const liquidityToRemove = lpBalance / 2n;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Don't approve LP tokens
        await expect(
            router.connect(signer).removeLiquidity(
                USDC_ADDRESS,
                DAI_ADDRESS,
                liquidityToRemove,
                0,
                0,
                WHALE_ADDRESS,
                deadline
            )
        ).to.be.reverted;
    });

    it("Should revert if deadline has passed", async function () {
        const lpBalance = await pair.balanceOf(WHALE_ADDRESS);
        const liquidityToRemove = lpBalance / 2n;
        const pastDeadline = Math.floor(Date.now() / 1000) - 60; // 1 minute ago

        await pair.connect(signer).approve(UNISWAP_V2_ROUTER, liquidityToRemove);

        await expect(
            router.connect(signer).removeLiquidity(
                USDC_ADDRESS,
                DAI_ADDRESS,
                liquidityToRemove,
                0,
                0,
                WHALE_ADDRESS,
                pastDeadline
            )
        ).to.be.revertedWith("UniswapV2Router: EXPIRED");
    });

    it("Should revert if minimum amounts not met", async function () {
        const lpBalance = await pair.balanceOf(WHALE_ADDRESS);
        const liquidityToRemove = lpBalance / 2n;
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

        // Set unrealistically high minimum amounts
        const minUSDCAmount = ethers.parseUnits("10000", 6); // Too high
        const minDAIAmount = ethers.parseUnits("10000", 18); // Too high

        await pair.connect(signer).approve(UNISWAP_V2_ROUTER, liquidityToRemove);

        await expect(
            router.connect(signer).removeLiquidity(
                USDC_ADDRESS,
                DAI_ADDRESS,
                liquidityToRemove,
                minUSDCAmount,
                minDAIAmount,
                WHALE_ADDRESS,
                deadline
            )
        ).to.be.revertedWith("UniswapV2Router: INSUFFICIENT_A_AMOUNT");
    });
});
