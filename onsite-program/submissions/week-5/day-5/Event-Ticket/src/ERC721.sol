// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract MyNft is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address initialOwner)
    ERC721("MyNft", "MNt")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, initialOwner);
        _grantRole(MINTER_ROLE, initialOwner);
    }

    function safeMint(address to, uint256 tokenId) public onlyRole(MINTER_ROLE) {
        _safeMint(to, tokenId);
    }

    // Required by AccessControl
    function supportsInterface(bytes4 interfaceId)
    public
    view
    override(ERC721, AccessControl)
    returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}