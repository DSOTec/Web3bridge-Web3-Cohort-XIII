import { expect } from "chai";
import { ethers } from "hardhat";
import { Employee } from "../typechain-types";

describe("Employee Contract", function () {
  let employee: Employee;
  let owner: any, user1: any, user2: any, outsider: any;

 beforeEach(async () => {
    [owner, user1, user2, outsider] = await ethers.getSigners();
    const EmployeeFactory = await ethers.getContractFactory("Employee");
    employee = (await EmployeeFactory.deploy()) as Employee;
    await employee.waitForDeployment();

    await employee.connect(owner).setOwner(owner.address);
  });


  it("should not allow owner to be set twice", async () => {
    await expect(employee.connect(owner).setOwner(user1.address)).to.be.revertedWith("Unauthorized()");
  });

  it("should register a user correctly", async () => {
    await employee.connect(owner).registerUser(user1.address, "Alice", ethers.parseEther("1000"), 0); // Mentor

    const details = await employee.getUserDetails(user1.address);
    expect(details[0]).to.equal("Alice");
    expect(details[1]).to.equal(ethers.parseEther("1000"));
    expect(details[2]).to.equal("mentor");
    expect(details[3]).to.equal(true);
  });

  it("should reject invalid role", async () => {
    await expect(
      employee.connect(owner).registerUser(user1.address, "Bob", ethers.parseEther("1000"), 5)
    ).to.be.revertedWith("InvalidRole(5)");
  });

  it("should reject duplicate registration", async () => {
    await employee.connect(owner).registerUser(user1.address, "Alice", ethers.parseEther("1000"), 1); // Admin
    await expect(
      employee.connect(owner).registerUser(user1.address, "Alice", ethers.parseEther("1000"), 1)
    ).to.be.revertedWith(`AlreadyRegistered("${user1.address}")`);
  });

  it("should disburse salary within limit", async () => {
    await employee.connect(owner).registerUser(user1.address, "Alice", ethers.parseEther("1000"), 0);
    await owner.sendTransaction({ to: employee.getAddress(), value: ethers.parseEther("2000") });

    const balanceBefore = await ethers.provider.getBalance(user1.address);
    await employee.connect(owner).disburseSalary(user1.address, ethers.parseEther("500"));
    const balanceAfter = await ethers.provider.getBalance(user1.address);

    expect(balanceAfter - balanceBefore).to.equal(ethers.parseEther("500"));
  });

  it("should reject salary disbursement above limit", async () => {
    await employee.connect(owner).registerUser(user1.address, "Alice", ethers.parseEther("1000"), 0);
    await expect(
      employee.connect(owner).disburseSalary(user1.address, ethers.parseEther("1500"))
    ).to.be.revertedWith("SalaryExceeded(1500000000000000000, 1000000000000000000)");
  });

  it("should reject salary disbursement to non-employee", async () => {
    await expect(
      employee.connect(owner).disburseSalary(user2.address, ethers.parseEther("100"))
    ).to.be.revertedWith(`NotEmployed("${user2.address}")`);
  });

  it("should return all registered users", async () => {
    await employee.connect(owner).registerUser(user1.address, "Alice", ethers.parseEther("1000"), 1);
    await employee.connect(owner).registerUser(user2.address, "Bob", ethers.parseEther("800"), 2);

    const users = await employee.getAllUsers();
    expect(users).to.include.members([user1.address, user2.address]);
  });

  it("should enforce onlyOwner modifier", async () => {
    await expect(
      employee.connect(outsider).registerUser(user1.address, "Alice", ethers.parseEther("1000"), 0)
    ).to.be.revertedWith("Unauthorized()");
  });
});
