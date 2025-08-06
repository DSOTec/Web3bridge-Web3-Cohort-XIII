// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleNFT {
    string public name = "SimpleNFT";
    string public symbol = "SNFT";
    uint256 public tokenCounter;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256) public balanceOf;
    mapping(uint256 => string) public tokenURI;

    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);

    constructor() {
        tokenCounter = 0;
    }

    function mint(string memory _tokenURI) public returns (uint256) {
        uint256 newTokenId = tokenCounter;
        ownerOf[newTokenId] = msg.sender;
        balanceOf[msg.sender] += 1;
        tokenURI[newTokenId] = _tokenURI;
        emit Transfer(address(0), msg.sender, newTokenId);
        tokenCounter++;
        return newTokenId;
    }
}
