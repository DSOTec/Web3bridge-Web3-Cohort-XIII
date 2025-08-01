// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TodoList {
    struct Todo {
        string title;
        string description;
        bool status;
    }

  
    mapping(address => Todo[]) private userTodos;

    function create_todo(string memory _title, string memory _description) external {
        Todo memory newTodo = Todo({ title: _title, description: _description, status: false });
        userTodos[msg.sender].push(newTodo);
    }

 
    function update_todo(uint256 _index, string memory _new_title, string memory _new_description) external {
        require(_index < userTodos[msg.sender].length, "Invalid index");
        userTodos[msg.sender][_index].title = _new_title;
        userTodos[msg.sender][_index].description = _new_description;
    }

    function toggle_todo_status(uint256 _index) external {
        require(_index < userTodos[msg.sender].length, "Invalid index");
        userTodos[msg.sender][_index].status = !userTodos[msg.sender][_index].status;
    }

 
    function get_todos() external view returns (Todo[] memory) {
        return userTodos[msg.sender];
    }

    function delete_todo(uint256 _index) external {
        require(_index < userTodos[msg.sender].length, "Invalid index");

        
        for (uint i = _index; i < userTodos[msg.sender].length - 1; i++) {
            userTodos[msg.sender][i] = userTodos[msg.sender][i + 1];
        }
        userTodos[msg.sender].pop();
    }
}
