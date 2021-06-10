// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Core/ACL.sol";

/**
 * @title SchellingCoin
 * @dev Very simple ERC20 Token example, where all tokens are pre-assigned to the creator.
 * Note they can later distribute these tokens as they wish using `transfer` and other
 * `ERC20` functions.
 */

contract SchellingCoin is ERC20, ACL {

    uint256 public constant DECIMALS = 18;
    //50 million supply. rest should be mintable
    uint256 public constant INITIAL_SUPPLY = 1000000000 * (10 ** uint256(DECIMALS));
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor () ERC20("SchellingCoin", "SCH") {
        _mint(msg.sender, INITIAL_SUPPLY);
   }
    
    function addMinter(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MINTER_ROLE, account);
    }

    function removeMinter(address account) external  onlyRole(DEFAULT_ADMIN_ROLE)  {        
        revokeRole(MINTER_ROLE, account);
    }

    function mint(address account, uint256 amount) external returns (bool) {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(account, amount);
        return true;
    }
}
