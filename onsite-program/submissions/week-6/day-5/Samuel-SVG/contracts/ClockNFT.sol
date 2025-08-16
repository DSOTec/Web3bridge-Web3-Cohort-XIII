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
    mapping(uint256 => uint256) private _mintTimestamps;

    constructor() ERC721("ClockNFT", "CLOCK") Ownable(msg.sender) {
        tokenCounter = 0;
    }
    
    function mint() public {
        _safeMint(msg.sender, tokenCounter);
        _mintTimestamps[tokenCounter] = block.timestamp;
        tokenCounter++;
    }

    function tokenURI(uint256 tokenId) public view virtual override(ERC721) returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        uint256 mintTime = _mintTimestamps[tokenId];
        string memory svg = generateSVG(mintTime);
        
        // Encode the SVG to base64
        string memory svgBase64 = Base64.encode(bytes(svg));
        
        // Create the JSON metadata
        string memory json = string(
            abi.encodePacked(
                '{"name":"Clock #', tokenId.toString(), '",',
                '"description":"On-chain SVG clock NFT showing the time when it was minted.",',
                '"image_data":"data:image/svg+xml;base64,', svgBase64, '",',
                '"external_url":"https://your-website.com/clocknft/",',
                '"attributes":[',
                '{"trait_type":"Minted At","display_type":"date","value":', mintTime.toString(), '}',
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

    function getSVGHeader() internal pure returns (string memory) {
        return '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n<svg width="1000" height="1000" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">\n  <rect width="100%" height="100%" fill="#1a1a2e"/>\n  <rect x="100" y="400" width="800" height="200" rx="30" fill="#0f3460" stroke="#4e9f3d" stroke-width="5"/>\n';
    }
    
    function getSVGFooter() internal pure returns (string memory) {
        return '  <text x="500" y="550" font-family="Arial, sans-serif" font-size="24" fill="#e94560" text-anchor="middle">Minted Time (UTC)</text>\n</svg>';
    }
    
    function generateSVG(uint256 timestamp) internal pure returns (string memory) {
        // Convert timestamp to hours, minutes, seconds
        uint256 hour = (timestamp / 3600) % 24;
        uint256 minute = (timestamp / 60) % 60;
        uint256 second = timestamp % 60;
        
        // Format time as HH:MM:SS
        string memory timeString = string(
            abi.encodePacked(
                formatTimeUnit(hour), 
                ':', 
                formatTimeUnit(minute),
                ':',
                formatTimeUnit(second)
            )
        );
        
        // Format date (day/month/year)
        (uint256 year, uint256 month, uint256 day) = getDateComponents(timestamp);
        string memory dateString = string(
            abi.encodePacked(
                formatTimeUnit(day),
                '/',
                formatTimeUnit(month),
                '/',
                year.toString()
            )
        );

        // Get SVG parts
        string memory header = getSVGHeader();
        string memory footer = getSVGFooter();
        
        // Create digital clock display
        string memory clockDisplay = string(
            abi.encodePacked(
                '<text x="500" y="500" font-family="Arial, monospace" font-size="100" fill="#4e9f3d" text-anchor="middle" font-weight="bold">',
                timeString,
                '</text>',
                '\n  <text x="500" y="650" font-family="Arial, sans-serif" font-size="36" fill="#e94560" text-anchor="middle">',
                dateString,
                '</text>'
            )
        );
        
        // Combine all parts
        return string(
            abi.encodePacked(
                header,
                '  ', clockDisplay, '\n',
                footer
            )
        );
    }
    
    function formatTimeUnit(uint256 unit) internal pure returns (string memory) {
        if (unit < 10) {
            return string(abi.encodePacked('0', unit.toString()));
        }
        return unit.toString();
    }
    
    function getDateComponents(uint256 timestamp) internal pure returns (uint256 year, uint256 month, uint256 day) {
        // This is a simplified version that approximates the date
        // For a production contract, you'd want to use a more accurate date library
        uint256 daysSinceEpoch = timestamp / 86400;
        year = 1970 + (daysSinceEpoch * 100) / 36525; // Approximate
        uint256 daysInYear = (year - 1969) / 4 + (year - 1970) * 365;
        uint256 dayOfYear = daysSinceEpoch - daysInYear;
        
        // Simple month calculation (approximate)
        month = (dayOfYear % 365) / 30 + 1;
        if (month > 12) month = 12;
        
        // Simple day calculation (approximate)
        day = (dayOfYear % 30) + 1;
        if (day > 31) day = 31;
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
        // Adjust rotation to start from 12 o'clock (0 degrees at top)
        uint256 svgRotation = (rotation + 90) % 360;
        
        // Create the transform string
        string memory transform = string(
            abi.encodePacked(
                'rotate(', 
                svgRotation.toString(), 
                ',', 
                x.toString(), 
                ',', 
                y.toString(), 
                ')'
            )
        );
        
        // Create the line element
        string memory line = string(
            abi.encodePacked(
                '<line x1="', x.toString(), 
                '" y1="', y.toString(), 
                '" x2="', x.toString(), 
                '" y2="', (y - length).toString(), 
                '" stroke="', color, 
                '" stroke-width="', width.toString(), 
                '" stroke-linecap="round"',
                ' transform="', transform, '"/>'
            )
        );
        
        // Create the circle element
        string memory circle = string(
            abi.encodePacked(
                '<circle cx="', x.toString(), 
                '" cy="', y.toString(), 
                '" r="', (width / 2).toString(), 
                '" fill="', color, '"',
                ' transform="', transform, '"/>'
            )
        );
        
        return string(abi.encodePacked(line, circle));
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
