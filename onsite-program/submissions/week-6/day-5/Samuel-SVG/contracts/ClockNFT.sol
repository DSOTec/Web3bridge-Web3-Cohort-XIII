// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract ClockNFT is ERC721, Ownable {
    using Strings for uint256;
    
    uint256 public tokenCounter;

    constructor() ERC721("ClockNFT", "CLOCK") Ownable(msg.sender) {
        tokenCounter = 0;
    }
    
    function mint() public {
        _safeMint(msg.sender, tokenCounter);
        tokenCounter++;
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        string memory svg = generateSVG(block.timestamp);
        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        '{"name": "Clock #', tokenId.toString(), ","
                        '"description": "On-chain SVG clock NFT showing the current time on the blockchain.",',
                        '"image": "data:image/svg+xml;base64,', 
                        Base64.encode(bytes(svg)),
                        '",',
                        '"attributes": [',
                        '{"trait_type": "Generated", "value": "',
                        block.timestamp.toString(),
                        '"}' 
                        ']',
                        '}'
                    )
                )
            )
        );
        return string(abi.encodePacked('data:application/json;base64,', json));
    }

    function generateSVG(uint256 timestamp) internal pure returns (string memory) {
        uint256 hour = (timestamp / 3600) % 12;
        uint256 minute = (timestamp / 60) % 60;
        uint256 second = timestamp % 60;
        
        return string(
            abi.encodePacked(
                '<svg width="350" height="350" viewBox="0 0 350 350" xmlns="http://www.w3.org/2000/svg">',
                '<rect width="100%" height="100%" fill="white"/>',
                '<circle cx="175" cy="175" r="160" fill="#f8f8f8" stroke="#333" stroke-width="2"/>',
                '<circle cx="175" cy="175" r="5" fill="#333"/>',
                getClockHand(175, 175, 100, 8, (hour * 30) + (minute / 2), "#333"),
                getClockHand(175, 175, 70, 5, minute * 6, "#555"),
                getClockHand(175, 175, 50, 2, second * 6, "red"),
                '</svg>'
            )
        );
    }
    
    function getClockHand(uint256 x, uint256 y, uint256 length, uint256 width, uint256 rotation, string memory color) 
        internal pure returns (string memory) 
    {
        return string(
            abi.encodePacked(
                '<line x1="', x.toString(), '" y1="', y.toString(), 
                '" x2="', x.toString(), '" y2="', (y - length).toString(), 
                '" stroke="', color, '" stroke-width="', width.toString(), 
                '" stroke-linecap="round" transform="rotate(', rotation.toString(), 
                ',', x.toString(), ',', y.toString(), ')"/>'
            )
        );
    }
    
    // Remove _burn override since we don't need custom burn logic
    // The default ERC721 _burn implementation will be used
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function encode3(uint8 a, uint8 b, uint8 c, string memory table) internal pure returns (bytes1, bytes1, bytes1, bytes1) {
        uint256 n = (uint256(a) << 16) | (uint256(b) << 8) | uint256(c);
        bytes memory tbl = bytes(table);
        return (
            tbl[(n >> 18) & 0x3F],
            tbl[(n >> 12) & 0x3F],
            tbl[(n >> 6) & 0x3F],
            tbl[n & 0x3F]
        );
    }

    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + value % 10));
            value /= 10;
        }
        return string(buffer);
    }
}
