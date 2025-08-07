// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "./IEmployee.sol";


contract EmployeeManager is IEmployee {
    address public owner;

    enum Role { Mentor, Admin, Security }

    struct User {
        string name;
        uint256 salary;
        Role role;
        bool isEmployed;
    }

    mapping(address => User) private users;
    address[] private userList;

    error NotEmployed(address user);
    error InvalidRole(uint8 role);
    error SalaryExceeded(uint256 requested, uint256 agreed);
    error AlreadyRegistered(address user);
    error Unauthorized();

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function setOwner(address newOwner) external {
        if (owner != address(0)) revert Unauthorized(); // Only allow once
        owner = newOwner;
    }

    function registerUser(address user, string calldata name, uint256 salary, uint8 role) external override onlyOwner {
        if (users[user].isEmployed) {
            revert AlreadyRegistered(user);
        }

        if (role > uint8(Role.Security)) {
            revert InvalidRole(role);
        }

        users[user] = User(name, salary, Role(role), true);
        userList.push(user);
    }

    function disburseSalary(address user, uint256 amount) external override onlyOwner {
        User memory u = users[user];

        if (!u.isEmployed) {
            revert NotEmployed(user);
        }

        if (amount > u.salary) {
            revert SalaryExceeded(amount, u.salary);
        }

        payable(user).transfer(amount);
    }

    function getAllUsers() external view override returns (address[] memory) {
        return userList;
    }

    function getUserDetails(address user) external view override returns (string memory, uint256, string memory, bool) {
        User memory u = users[user];
        return (u.name, u.salary, roleToString(u.role), u.isEmployed);
    }

    function roleToString(Role role) internal pure returns (string memory) {
        if (role == Role.Mentor) return "mentor";
        if (role == Role.Admin) return "admin";
        return "security";
    }

    receive() external payable {}
}
