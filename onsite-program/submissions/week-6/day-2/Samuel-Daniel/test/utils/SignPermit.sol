// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

contract SignPermit is Test {
    bytes32 internal constant PERMIT_TYPEHASH = keccak256(
        "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
    );

    function getPermitSignature(
        uint256 privateKey,
        string memory tokenName,
        uint256 chainId,
        address tokenAddress,
        address owner,
        address spender,
        uint256 value,
        uint256 nonce,
        uint256 deadline
    ) public returns (uint8 v, bytes32 r, bytes32 s) {

        bytes32 domainSeparator = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(tokenName)),
                keccak256(bytes("1")), // Version
                chainId,
                tokenAddress
            )
        );


        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                nonce,
                deadline
            )
        );


        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        (v, r, s) = vm.sign(privateKey, digest);

        if (v < 27) {
            v += 27;
        }
        

        return (v, r, s);
    }
}
