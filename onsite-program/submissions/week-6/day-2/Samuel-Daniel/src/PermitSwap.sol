// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IERC20Permit.sol";
import "./interfaces/IUniswapV2Router02.sol";

contract PermitSwap {
    function permitAndSwap(
        address token,
        address router,
        uint256 amount,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        address[] calldata path,
        uint256 minOut
    ) external {
        IERC20Permit(token).permit(
            msg.sender,
            address(this),
            amount,
            deadline,
            v, r, s
        );

        IERC20Permit(token).transferFrom(msg.sender, address(this), amount);
        IERC20Permit(token).approve(router, amount);

        IUniswapV2Router02(router).swapExactTokensForTokens(
            amount,
            minOut,
            path,
            msg.sender,
            deadline
        );
    }
}
