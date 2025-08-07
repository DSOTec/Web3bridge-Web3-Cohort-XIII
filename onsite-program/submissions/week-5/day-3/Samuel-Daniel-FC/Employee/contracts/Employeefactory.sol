// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Employee.sol";

contract EmployeeFactory {
    // Array to store all deployed EmployeeManager contracts
    address[] public allManagers;

    // Event emitted when a new EmployeeManager is created
    event ManagerCreated(address indexed managerAddress, address indexed owner);

    /// @notice Deploys a new EmployeeManager contract and sets the caller as the owner
    function createManager() external returns (address) {
        Employee manager = new Employee();
        manager.setOwner(msg.sender);
        allManagers.push(address(manager));
        emit ManagerCreated(address(manager), msg.sender);
        return address(manager);
    }

    /// @notice Returns all deployed EmployeeManager contract addresses
    function getAllManagers() external view returns (address[] memory) {
        return allManagers;
    }
}
