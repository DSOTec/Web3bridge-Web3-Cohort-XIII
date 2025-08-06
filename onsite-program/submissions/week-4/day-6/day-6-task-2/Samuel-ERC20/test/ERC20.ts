import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "@typechain/hardhat";How to create an  NFT smart contract and deploy it and must show on opensea
import type { ERC20 } from "../typechain-types/ERC20";


async function deployERC20() {
  const [owner, addr1, addr2] = await hre.ethers.getSigners();
  const ERC20Factory = await hre.ethers.getContractFactory("ERC20");
  const erc20 = (await ERC20Factory.deploy()) as ERC20;
  await erc20.mint(owner.address, 1000);
  return { erc20, owner, addr1, addr2 };
}

describe("ERC20", function () {
  it("Should mint tokens to an address", async function () {
    const { erc20, owner } = await loadFixture(deployERC20);
    expect(await erc20.balanceOf(owner.address)).to.equal(1000);
    expect(await erc20.totalSupply()).to.equal(1000);
  });

  it("Should transfer tokens between accounts", async function () {
    const { erc20, owner, addr1 } = await loadFixture(deployERC20);
    await erc20.transfer(addr1.address, 100);
    expect(await erc20.balanceOf(addr1.address)).to.equal(100);
    expect(await erc20.balanceOf(owner.address)).to.equal(900);
  });

  it("Should approve allowance for another account", async function () {
    const { erc20, owner, addr1 } = await loadFixture(deployERC20);
    await erc20.approve(addr1.address, 200);
    expect(await erc20.allowance(owner.address, addr1.address)).to.equal(200);
  });

  it("Should transfer tokens using transferFrom", async function () {
    const { erc20, owner, addr1, addr2 } = await loadFixture(deployERC20);
    await erc20.approve(addr1.address, 150);
    await erc20.connect(addr1).transferFrom(owner.address, addr2.address, 150);
    expect(await erc20.balanceOf(addr2.address)).to.equal(150);
    expect(await erc20.balanceOf(owner.address)).to.equal(850);
    expect(await erc20.allowance(owner.address, addr1.address)).to.equal(0);
  });

  it("Should burn tokens from an address", async function () {
    const { erc20, owner } = await loadFixture(deployERC20);
    await erc20.burn(owner.address, 300);
    expect(await erc20.balanceOf(owner.address)).to.equal(700);
    expect(await erc20.totalSupply()).to.equal(700);
  });

  it("Should not allow transfer of more than balance", async function () {
    const { erc20, owner, addr1 } = await loadFixture(deployERC20);
    await expect(erc20.connect(addr1).transfer(owner.address, 1)).to.be.revertedWith(
      "ERC20: transfer amount exceeds balance"
    );
  });

  it("Should not allow transferFrom of more than allowance", async function () {
    const { erc20, owner, addr1, addr2 } = await loadFixture(deployERC20);
    await erc20.approve(addr1.address, 100);
    await expect(
      erc20.connect(addr1).transferFrom(owner.address, addr2.address, 101)
    ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
  });

  it("Should not allow burn of more than balance", async function () {
    const { erc20, owner } = await loadFixture(deployERC20);
    await expect(erc20.burn(owner.address, 1001)).to.be.revertedWith(
      "ERC20: burn amount exceeds balance"
    );
  });
});