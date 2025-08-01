// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Schoolmanagement {
    error STUDENT_NOT_FOUND();
    error INVALID_ID();

    enum Status { ACTIVE, DEFERRED, RUSTICATED }

    struct StudentDetails {
        uint256 id;
        string name;
        string course;
        uint256 age;
        Status status;
    }

    uint256 private uid;

    
    mapping(address => StudentDetails[]) private userStudents;

   
    function another_registration(StudentDetails memory details) external {
        uid += 1;
        StudentDetails memory newStudent = StudentDetails(uid, details.name, details.course, details.age, Status.ACTIVE);
        userStudents[msg.sender].push(newStudent);
    }

    function register_student(string memory _name, string memory _course, uint256 _age) external {
        uid += 1;
        StudentDetails memory newStudent = StudentDetails(uid, _name, _course, _age, Status.ACTIVE);
        userStudents[msg.sender].push(newStudent);
    }

   
    function update_student(uint256 _student_id, string memory _new_name) external {
        StudentDetails[] storage students = userStudents[msg.sender];
        for (uint256 i = 0; i < students.length; i++) {
            if (students[i].id == _student_id) {
                students[i].name = _new_name;
                return;
            }
        }
        revert STUDENT_NOT_FOUND();
    }

    
    function get_student_by_id(uint256 _student_id) external view returns (StudentDetails memory) {
        StudentDetails[] storage students = userStudents[msg.sender];
        for (uint256 i = 0; i < students.length; i++) {
            if (students[i].id == _student_id) {
                return students[i];
            }
        }
        revert STUDENT_NOT_FOUND();
    }

    function update_students_status(uint256 _student_id, Status _new_status) external {
        StudentDetails[] storage students = userStudents[msg.sender];
        for (uint256 i = 0; i < students.length; i++) {
            if (students[i].id == _student_id) {
                students[i].status = _new_status;
                return;
            }
        }
        revert INVALID_ID();
    }

    function delete_student(uint256 _student_id) external {
        StudentDetails[] storage students = userStudents[msg.sender];
        for (uint256 i = 0; i < students.length; i++) {
            if (students[i].id == _student_id) {
                students[i] = students[students.length - 1];
                students.pop();
                return;
            }
        }
        revert STUDENT_NOT_FOUND();
    }

   
    function get_all_students() external view returns (StudentDetails[] memory) {
        return userStudents[msg.sender];
    }
}
