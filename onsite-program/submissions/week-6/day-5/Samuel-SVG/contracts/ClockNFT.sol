// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Base64.sol";
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

        // Generate the SVG
        string memory svg = generateSVG(block.timestamp);
        
        // Encode the SVG to base64
        string memory svgBase64 = Base64.encode(bytes(svg));
        
        // Create the JSON metadata
        string memory json = string(
            abi.encodePacked(
                '{"name":"Clock #', tokenId.toString(), '",',
                '"description":"On-chain SVG clock NFT showing the current time on the blockchain.",',
                '"image_data":"data:image/svg+xml;base64,', svgBase64, '",',
                '"external_url":"https://your-website.com/clocknft/",',
                '"attributes":[',
                '{"trait_type":"Generated","value":"', block.timestamp.toString(), '"}',
                ']}'
            )
        );
        
        // Encode the JSON to base64
        return string(
            abi.encodePacked(
                "data:application/json;base64,",
                Base64.encode(bytes(json))
            )
        );
    }

    function generateSVG(uint256 timestamp) internal view returns (string memory) {
        uint256 hour = (timestamp / 3600) % 12;
        uint256 minute = (timestamp / 60) % 60;
        uint256 second = timestamp % 60;
        
        // Calculate angles for clock hands
        uint256 hourAngle = (hour * 30 + minute / 2) % 360; // 30 degrees per hour, 0.5 degrees per minute
        uint256 minuteAngle = (minute * 6) % 360; // 6 degrees per minute
        uint256 secondAngle = (second * 6) % 360; // 6 degrees per second

        // Get clock markings
        string memory markings = getClockMarkings();
        
        // Generate the SVG
        return string(
            abi.encodePacked(
                '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
                '<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">',
                '<rect width="100%" height="100%" fill="#f0f0f0"/>',
                '<circle cx="500" cy="500" r="450" fill="#fff" stroke="#333" stroke-width="20"/>',
                markings, // Add the clock markings
                // Clock hands
                getClockHand(500, 500, 200, 20, hourAngle, "#333"),   // Hour hand
                getClockHand(500, 500, 300, 12, minuteAngle, "#666"), // Minute hand
                getClockHand(500, 500, 350, 6, secondAngle, "#f00"),  // Second hand
                '<circle cx="500" cy="500" r="20" fill="#333"/>',    // Center dot
                '</svg>'
            )
        );
    }
    
    function getClockMarkings() internal view returns (string memory) {
        string memory markings = '';
        
        // Add hour markings (12 positions)
        for (uint256 i = 0; i < 12; i++) {
            uint256 angle = i * 30; // 30 degrees between each hour mark (360/12)
            int256 sinVal = sin(angle);
            int256 cosVal = cos(angle);
            
            // Calculate coordinates with proper type casting and scaling
            uint256 x1 = 500 + uint256(400 * sinVal) / 1000;
            uint256 y1 = 500 - uint256(400 * cosVal) / 1000;
            uint256 x2 = 500 + uint256(350 * sinVal) / 1000;
            uint256 y2 = 500 - uint256(350 * cosVal) / 1000;
            
            // Ensure coordinates are within bounds
            x1 = (x1 > 1000) ? 1000 : x1;
            y1 = (y1 > 1000) ? 1000 : y1;
            x2 = (x2 > 1000) ? 1000 : x2;
            y2 = (y2 > 1000) ? 1000 : y2;
            
            markings = string(
                abi.encodePacked(
                    markings,
                    '<line x1="', uint2str(x1), '" y1="', uint2str(y1), 
                    '" x2="', uint2str(x2), '" y2="', uint2str(y2), 
                    '" stroke="#333333" stroke-width="15"/>'
                )
            );
        }
        
        return markings;
    }
    
    function sin(uint256 angle) internal view returns (int256) {
        // Simple sine approximation (1 decimal place precision)
        uint256 angleMod = angle % 360;
        if (angleMod <= 90) return sinTable[uint8(angleMod)];
        if (angleMod <= 180) return sinTable[uint8(180 - angleMod)];
        if (angleMod <= 270) return -sinTable[uint8(angleMod - 180)];
        return -sinTable[uint8(360 - angleMod)];
    }
    
    function cos(uint256 angle) internal view returns (int256) {
        return sin(angle + 90);
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
    
    // Sine table for 0-90 degrees (scaled by 1000 for integer math)
    int256[91] private sinTable = [
        int256(0), int256(17), int256(35), int256(52), int256(70), int256(87), int256(105), int256(122), int256(139), int256(156), 
        int256(174), int256(191), int256(208), int256(225), int256(242), int256(259), int256(276), int256(292), int256(309), int256(326), 
        int256(342), int256(358), int256(375), int256(391), int256(407), int256(423), int256(438), int256(454), int256(469), int256(485), 
        int256(500), int256(515), int256(530), int256(545), int256(559), int256(574), int256(588), int256(602), int256(616), int256(629), 
        int256(643), int256(656), int256(669), int256(682), int256(695), int256(707), int256(719), int256(731), int256(743), int256(755), 
        int256(766), int256(777), int256(788), int256(799), int256(809), int256(819), int256(829), int256(839), int256(848), int256(857), 
        int256(866), int256(875), int256(883), int256(891), int256(899), int256(906), int256(914), int256(921), int256(927), int256(934), 
        int256(940), int256(946), int256(951), int256(956), int256(961), int256(966), int256(970), int256(974), int256(978), int256(982), 
        int256(985), int256(988), int256(990), int256(993), int256(995), int256(996), int256(998), int256(999), int256(999), int256(1000), int256(1000)
    ];
    
    function uint2str(uint256 _i) internal pure returns (string memory) {
        if (_i == 0) return "0";
        uint256 j = _i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        j = _i;
        while (j != 0) {
            bstr[--k] = bytes1(uint8(48 + j % 10));
            j /= 10;
        }
        return string(bstr);
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
