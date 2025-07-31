// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Access {
    
    enum Role {
        MediaTeam,
        Mentors,
        Managers,
        SocialMediaTeam,
        TechnicianSupervisors,
        KitchenStaff,
        Terminated
    }

    
    struct Employee {
        string name;
        Role role;
        bool isEmployed;
    }

  
    mapping(address => Employee) public employees;

    address[] public employeeAddresses;

  
    function addOrUpdateEmployee(
        address _wallet,
        string memory _name,
        Role _role,
        bool _isEmployed
    ) public {
      
        if (bytes(employees[_wallet].name).length == 0) {
            employeeAddresses.push(_wallet);
        }

    
        employees[_wallet] = Employee({
            name: _name,
            role: _role,
            isEmployed: _isEmployed
        });
    }

   
    function canAccessGarage(address _wallet) public view returns (bool) {
        Employee memory emp = employees[_wallet];

        if (!emp.isEmployed || emp.role == Role.Terminated) {
            return false;
        }

        if (
            emp.role == Role.MediaTeam ||
            emp.role == Role.Mentors ||
            emp.role == Role.Managers
        ) {
            return true;
        }

        return false;
    }


    function getAllEmployees() public view returns (address[] memory) {
        return employeeAddresses;
    }

    function getEmployeeDetails(address _wallet) public view returns (
        string memory name,
        Role role,
        bool isEmployed
    ) {
        Employee memory emp = employees[_wallet];
        return (emp.name, emp.role, emp.isEmployed);
    }
}


