import { expect } from "chai";
import hre from "hardhat";
import { MultiSigWalletFactory, MultiSigWallet } from "../typechain-types";

describe("MultiSigWalletFactory using hre without beforeEach", function () {
  it("should require 3 approvals before executing", async () => {
    const signers = await hre.ethers.getSigners();
    const [owner1, owner2, owner3, owner4, recipient] = signers;
    const owners = [owner1.address, owner2.address, owner3.address, owner4.address];
    const requiredApprovals = 3;

    const Factory = await hre.ethers.getContractFactory("MultiSigWalletFactory");
    const factory = await Factory.deploy() as MultiSigWalletFactory;
    await factory.createWallet(owners, requiredApprovals);

    const walletAddress = (await factory.getWallets())[0];
    const wallet = await hre.ethers.getContractAt("MultiSigWallet", walletAddress) as MultiSigWallet;

    await owner1.sendTransaction({
      to: walletAddress,
      value: hre.ethers.utils.parseEther("10"),
    });

    await wallet.connect(owner1).submitTransaction(recipient.address, hre.ethers.utils.parseEther("1"));
    await wallet.connect(owner1).approveTransaction(0);
    await wallet.connect(owner2).approveTransaction(0);

    let tx = await wallet.transactions(0);
    expect(tx.executed).to.be.false;

    await wallet.connect(owner3).approveTransaction(0);

    tx = await wallet.transactions(0);
    expect(tx.executed).to.be.true;
  });

  it("should revert if non-owner tries to approve", async () => {
    const signers = await hre.ethers.getSigners();
    const [owner1, owner2, owner3, owner4, outsider] = signers;
    const owners = [owner1.address, owner2.address, owner3.address, owner4.address];
    const requiredApprovals = 3;

    const Factory = await hre.ethers.getContractFactory("MultiSigWalletFactory");
    const factory = await Factory.deploy() as MultiSigWalletFactory;
    await factory.createWallet(owners, requiredApprovals);

    const walletAddress = (await factory.getWallets())[0];
    const wallet = await hre.ethers.getContractAt("MultiSigWallet", walletAddress) as MultiSigWallet;

    await expect(
      wallet.connect(outsider).submitTransaction(outsider.address, hre.ethers.utils.parseEther("1"))
    ).to.be.revertedWithCustomError(wallet, "NotOwner");
  });

  it("should revert if already approved", async () => {
    const signers = await hre.ethers.getSigners();
    const [owner1, owner2, owner3, owner4] = signers;
    const owners = [owner1.address, owner2.address, owner3.address, owner4.address];
    const requiredApprovals = 3;

    const Factory = await hre.ethers.getContractFactory("MultiSigWalletFactory");
    const factory = await Factory.deploy() as MultiSigWalletFactory;
    await factory.createWallet(owners, requiredApprovals);

    const walletAddress = (await factory.getWallets())[0];
    const wallet = await hre.ethers.getContractAt("MultiSigWallet", walletAddress) as MultiSigWallet;

    await wallet.connect(owner1).submitTransaction(owner1.address, hre.ethers.utils.parseEther("1"));
    await wallet.connect(owner1).approveTransaction(0);

    await expect(wallet.connect(owner1).approveTransaction(0)).to.be.revertedWithCustomError(wallet, "AlreadyApproved");
  });
});
