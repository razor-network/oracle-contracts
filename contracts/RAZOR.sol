// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title RAZOR
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */

contract RAZOR is ERC20{
    uint256 public constant DECIMALS = 18;
    uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(DECIMALS));
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor () ERC20("RAZOR", "RAZOR") {
        _mint(msg.sender, INITIAL_SUPPLY);
    }

}
