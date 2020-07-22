// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/access/AccessControl.sol";

/**
 * @title SchellingCoin
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */

contract SchellingCoin is ERC20, AccessControl {
    uint8 public constant DECIMALS = 18;
    //50 million supply. rest should be mineable
    uint256 public constant INITIAL_SUPPLY = 50000000 * (10 ** uint256(DECIMALS));
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor (address minter) public ERC20("SchellingCoin", "SCH") {
        _mint(msg.sender, INITIAL_SUPPLY);
        _setupRole(MINTER_ROLE, minter);
    }

    function mint(address account, uint256 amount) external returns (bool) {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(account, amount);
    }

}
