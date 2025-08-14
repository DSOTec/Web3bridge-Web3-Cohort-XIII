// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RoleNFT is ERC721, Ownable {
    // Add this mapping to track token existence
    mapping(uint256 => bool) private _tokenExists;
    uint256 public nextTokenId;

    struct RoleData {
        bool active;
        uint256 expiresAt;
    }

    mapping(uint256 => mapping(string => RoleData)) public tokenRoles;

    constructor() ERC721("RoleNFT", "RNFT") Ownable(msg.sender) {}

    function mint(address to, string[] memory roles, uint256 duration) external onlyOwner {
        uint256 tokenId = nextTokenId++;
        _mint(to, tokenId);
        _tokenExists[tokenId] = true;
        uint256 expiry = block.timestamp + duration;
        for (uint i = 0; i < roles.length; i++) {
            tokenRoles[tokenId][roles[i]] = RoleData(true, expiry);
        }
    }

    function assignRole(uint256 tokenId, string memory role, uint256 duration) external onlyOwner {
        require(_tokenExists[tokenId], "Token does not exist");
        tokenRoles[tokenId][role] = RoleData(true, block.timestamp + duration);
    }

    function revokeRole(uint256 tokenId, string memory role) external onlyOwner {
        require(_tokenExists[tokenId], "Token does not exist");
        tokenRoles[tokenId][role].active = false;
    }

    function hasRole(address user, string memory role) external view returns (bool) {
        for (uint256 i = 0; i < nextTokenId; i++) {
            if (
                ownerOf(i) == user &&
                tokenRoles[i][role].active &&
                tokenRoles[i][role].expiresAt > block.timestamp
            ) {
                return true;
            }
        }
        return false;
    }
}
