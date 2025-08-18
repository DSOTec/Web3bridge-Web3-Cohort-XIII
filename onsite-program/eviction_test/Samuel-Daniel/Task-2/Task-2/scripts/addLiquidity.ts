import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");
async function main() {

    const assetAddress = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";
    await helpers.impersonateAccount(assetAddress);  // we are initializing the impersonated account
    const signer = await ethers.getSigner(assetAddress); // to get the private key of the impersonated address
     
    
    const usdcaddress = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const daiaddress =  "0x6B175474E89094C44Da98b954EedeAC495271d0F";

    const UNIRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

    // we need to declare the token

    const usdc = await ethers.getContractAt("IERC20" ,usdcaddress);
    const dai = await ethers.getContractAt("IERC20", daiaddress);

    // We need to get the balance 

    const usdcbalance = await usdc.balanceOf(assetAddress); //it's checking the balance of usdc of the impersonated address
    const daibalance = await dai.balanceOf(assetAddress);  // it's checking the balance of dai of the impersonated address
    
  //  because we a simulate / mimmick and know what is going on in the transactions, we need to console log so that we can have it on our terminal

  console.log("balance before the transaction");
  console.log("usdc balance before transaction", ethers.formatUnits(usdcbalance.toString(), 18));  //you make use of format unit when it's an output and make use of parseUnits when it's an input;
  console.log("dai balance before transaction", ethers.formatUnits(daibalance.toString(), 6));

  //declare router contract
  const router = await ethers.getContractAt("IUniswapV2Router01", UNIRouter);

  const usdcAmount = ethers.parseUnits("1000", 6); // 10,000 USDC 
  const daiAmount = ethers.parseUnits("1000", 18); // 10,000 DAI

  // The next step is to approve the impersonated signer to spend the USDC and DAI tokens.

  const usdcApprove = await usdc.connect(signer).approve(UNIRouter, usdcAmount);
  const addtx1 = await usdcApprove.wait(); // wait for the transaction to be mined
    console.log("USDC Approval Transaction Hash:", addtx1);

    const daiApprove = await dai.connect(signer).approve(UNIRouter, daiAmount);
    const addtx2 = await daiApprove.wait(); // wait for the transaction to be mined
    console.log("DAI Approval Transaction Hash:", addtx2);

    const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes from now
    const provideLiquidity = await router.connect(signer).addLiquidity(
        usdcaddress,
        daiaddress,
        usdcAmount,
        daiAmount,
        usdcAmount, // minimum amount of USDC to add
        daiAmount, // minimum amount of DAI to add
        assetAddress, // address to receive the liquidity tokens
        deadline // deadline for the transaction 
        );

        const addtx3 = await provideLiquidity.wait(); // wait for the transaction to be mined
        console.log("Liquidity Provision Transaction Hash:", addtx3);

    // After the transaction, we can check the balances again
      const usdcbalanceAfter = await usdc.balanceOf(assetAddress); //it's checking the balance of usdc of the impersonated address
    const daibalanceAfter = await dai.balanceOf(assetAddress);  // it's checking the balance of dai of the impersonated address
    
  
  console.log("usdc balance before transaction", ethers.formatUnits(usdcbalanceAfter.toString(), 18));  //you make use of format unit when it's an output and make use of parseUnits when it's an input;
  console.log("dai balance before transaction", ethers.formatUnits(daibalanceAfter.toString(), 6));


}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
