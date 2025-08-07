import { expect } from "chai";
import hre from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deploySchoolMS() {
  const SchoolMS = await hre.ethers.getContractFactory("SchoolMS");
  const schoolms = await SchoolMS.deploy();
  return { schoolms };
}

describe("SchoolMS", function () {
  describe("Student registration", function () {
    it("Should register a student", async function () {
      const { schoolms } = await loadFixture(deploySchoolMS);
      const name = "Samuel";
      const age = 30;
      const email = "sdamiloladaniel@gmail.com";

      await schoolms.createStudent(name, email, age);
      const student = await schoolms.getStudent(1);

      expect(student.name).to.equal(name);
      expect(student.email).to.equal(email);
      expect(student.age).to.equal(age);
      expect(student.status).to.equal(0); // ACTIVE
    });

    it("Should update a student's details", async function () {
      const { schoolms } = await loadFixture(deploySchoolMS);
      await schoolms.createStudent("Sam", "sam@email.com", 20);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               

      await schoolms.updateStudent(1, "Samuel", "samuel@email.com", 25);
      const student = await schoolms.getStudent(1);

      expect(student.name).to.equal("Samuel");
      expect(student.email).to.equal("samuel@email.com");
      expect(student.age).to.equal(25);
    });

    it("Should delete a student", async function () {
      const { schoolms } = await loadFixture(deploySchoolMS);
      await schoolms.createStudent("Sam", "sam@email.com", 20);

      await schoolms.deleteStudent(1);

      await expect(schoolms.getStudent(1)).to.be.revertedWith("Student not found");
      const allStudents = await schoolms.getAllStudents();
      expect(allStudents.length).to.equal(0);
    });

    it("Should change a student's status", async function () {
      const { schoolms } = await loadFixture(deploySchoolMS);
      await schoolms.createStudent("Sam", "sam@email.com", 20);

      // 1 = DEFERRED
      await schoolms.changeStatus(1, 1);
      let student = await schoolms.getStudent(1);
      expect(student.status).to.equal(1);

      // 2 = RUSTICATED
      await schoolms.changeStatus(1, 2);
      student = await schoolms.getStudent(1);
      expect(student.status).to.equal(2);
    });

    it("Should return all students", async function () {
      const { schoolms } = await loadFixture(deploySchoolMS);
      await schoolms.createStudent("Sam", "sam@email.com", 20);
      await schoolms.createStudent("Jane", "jane@email.com", 22);

      const allStudents = await schoolms.getAllStudents();
      expect(allStudents.length).to.equal(2);
      expect(allStudents[0].name).to.equal("Sam");
      expect(allStudents[1].name).to.equal("Jane");
    });

    it("Should revert when getting a non-existent student", async function () {
      const { schoolms } = await loadFixture(deploySchoolMS);
      await expect(schoolms.getStudent(999)).to.be.revertedWith("Student not found");
    });
  });
});