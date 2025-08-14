// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract MockERC1155 is ERC1155, Ownable {
    mapping(uint256 => string) private _tokenURIs;
    uint256 private _currentTokenID = 0;
    
    constructor(string memory _uri) ERC1155(_uri) {}
    
    function mint(
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) external onlyOwner {
        _mint(to, id, amount, data);
    }
    
    function mintBatch(
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        _mintBatch(to, ids, amounts, data);
    }
    
    function createToken(
        address to,
        uint256 amount,
        string memory tokenURI,
        bytes memory data
    ) external onlyOwner returns (uint256) {
        uint256 newTokenID = _getNextTokenID();
        _incrementTokenTypeId();
        
        if (bytes(tokenURI).length > 0) {
            _tokenURIs[newTokenID] = tokenURI;
        }
        
        _mint(to, newTokenID, amount, data);
        
        return newTokenID;
    }
    
    function uri(uint256 tokenId) public view override returns (string memory) {
        string memory tokenURI = _tokenURIs[tokenId];
        
        if (bytes(tokenURI).length > 0) {
            return tokenURI;
        }
        
        return super.uri(tokenId);
    }
    
    function setTokenURI(uint256 tokenId, string memory tokenURI) external onlyOwner {
        _tokenURIs[tokenId] = tokenURI;
    }
    
    function _getNextTokenID() private view returns (uint256) {
        return _currentTokenID + 1;
    }
    
    function _incrementTokenTypeId() private {
        _currentTokenID++;
    }
    
    function getCurrentTokenID() external view returns (uint256) {
        return _currentTokenID;
    }
}
