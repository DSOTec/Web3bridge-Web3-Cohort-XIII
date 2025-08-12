// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/PermitSwap.sol";
import "./utils/SignPermit.sol";

contract MockERC20Permit is IERC20Permit {
    string public constant name = "Test Token";
    string public constant symbol = "TST";
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public nonces;

    bytes32 public DOMAIN_SEPARATOR;
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH = 0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor() {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
                keccak256(bytes(name)),
                keccak256(bytes('1')),
                chainId,
                address(this)
            )
        );
    }

    function mint(address to, uint256 amount) public {
        balanceOf[to] += amount;
        totalSupply += amount;
        emit Transfer(address(0), to, amount);
    }

    function transfer(address to, uint256 amount) public returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }
    
    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external override {
        require(deadline >= block.timestamp, 'PERMIT_DEADLINE_EXPIRED');
        
        bytes32 digest = keccak256(
            abi.encodePacked(
                '\x19\x01',
                DOMAIN_SEPARATOR,
                keccak256(abi.encode(PERMIT_TYPEHASH, owner, spender, value, nonces[owner]++, deadline))
            )
        );
        
        address recoveredAddress = ecrecover(digest, v, r, s);
        require(recoveredAddress != address(0) && recoveredAddress == owner, 'INVALID_SIGNATURE');
        
        allowance[owner][spender] = value;
        emit Approval(owner, spender, value);
    }
}

contract MockRouter {
    function swapExactTokensForTokens(
        uint amountIn,
        uint /* amountOutMin */,
        address[] calldata path,
        address to,
        uint /* deadline */
    ) external returns (uint[] memory amounts) {
        // Simulate a simple 1:1 swap
        IERC20(path[0]).transferFrom(msg.sender, address(this), amountIn);
        IERC20(path[1]).transfer(to, amountIn);
        
        uint[] memory result = new uint[](2);
        result[0] = amountIn;
        result[1] = amountIn;
        return result;
    }
}

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract PermitSwapTest is Test {
    SignPermit signPermit;

    PermitSwap permitSwap;
    MockERC20Permit tokenIn;
    MockERC20Permit tokenOut;
    MockRouter router;

    uint256 private userPrivateKey = 0xA11CE;
    address private user = vm.addr(userPrivateKey);

    function setUp() public {
        // Set up the test environment
        signPermit = new SignPermit();
        permitSwap = new PermitSwap();
        tokenIn = new MockERC20Permit();
        tokenOut = new MockERC20Permit();
        router = new MockRouter();
        
        // Mint tokens to the user
        tokenIn.mint(user, 1000 ether);
        
        // Mint tokens to the router to simulate available liquidity
        tokenOut.mint(address(router), 1000 ether);
        
        // Approve the router to spend tokens from the contract
        tokenOut.approve(address(router), type(uint256).max);
    }
    
    function testPermitAndSwap() public {
        // Arrange
        uint256 amount = 100 ether;
        uint256 deadline = block.timestamp + 1 hours;
        
        // Get initial balances
        uint256 initialUserTokenIn = tokenIn.balanceOf(user);
        uint256 initialUserTokenOut = tokenOut.balanceOf(user);
        
        // Get current nonce for the user
        uint256 nonce = tokenIn.nonces(user);
        
        // Get permit signature
        (uint8 v, bytes32 r, bytes32 s) = signPermit.getPermitSignature(
            userPrivateKey,
            tokenIn.name(),
            block.chainid,
            address(tokenIn),
            user,
            address(permitSwap),
            amount,
            nonce,
            deadline
        );
        
        // Prepare the swap path
        address[] memory path = new address[](2);
        path[0] = address(tokenIn);
        path[1] = address(tokenOut);
        
        // Act
        vm.prank(user);
        permitSwap.permitAndSwap(
            address(tokenIn),
            address(router),
            amount,
            deadline,
            v, r, s,
            path,
            0 // minOut
        );
        
        // Assert
        uint256 finalUserTokenIn = tokenIn.balanceOf(user);
        uint256 finalUserTokenOut = tokenOut.balanceOf(user);
        
        assertEq(finalUserTokenIn, initialUserTokenIn - amount, "User tokenIn balance should decrease by amount");
        assertGt(finalUserTokenOut, initialUserTokenOut, "User tokenOut balance should increase");
        assertEq(tokenIn.allowance(user, address(permitSwap)), 0, "PermitSwap should not have any remaining allowance");
    }
    
    function test_RevertWhen_DeadlineExpired() public {
        // Arrange
        uint256 amount = 100 ether;
        uint256 deadline = block.timestamp - 1; // Already expired
        
        // Get current nonce for the user
        uint256 nonce = tokenIn.nonces(user);
        
        // Get permit signature with expired deadline
        (uint8 v, bytes32 r, bytes32 s) = signPermit.getPermitSignature(
            userPrivateKey,
            tokenIn.name(),
            block.chainid,
            address(tokenIn),
            user,
            address(permitSwap),
            amount,
            nonce,
            deadline
        );
        
        // Prepare the swap path
        address[] memory path = new address[](2);
        path[0] = address(tokenIn);
        path[1] = address(tokenOut);
        
        // Get initial balances
        uint256 initialUserTokenIn = tokenIn.balanceOf(user);
        uint256 initialUserTokenOut = tokenOut.balanceOf(user);
        
        // Act & Assert
        vm.prank(user);
        
        // Expect a revert with the correct error message
        vm.expectRevert(bytes("PERMIT_DEADLINE_EXPIRED"));
        
        // Attempt the permit and swap with expired deadline
        permitSwap.permitAndSwap(
            address(tokenIn),
            address(router),
            amount,
            deadline,
            v, r, s,
            path,
            0 // minOut
        );
        
        // Additional assertions to ensure no state changes occurred
        assertEq(tokenIn.balanceOf(user), initialUserTokenIn, "User's tokenIn balance should remain unchanged");
        assertEq(tokenOut.balanceOf(user), initialUserTokenOut, "User's tokenOut balance should remain unchanged");
        assertEq(tokenIn.allowance(user, address(permitSwap)), 0, "PermitSwap should not have any allowance");
    }
}