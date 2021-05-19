// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./Core/ACL.sol";

contract StakedToken is ERC20, ACL {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor(address minter) ERC20("sRZR", "sRZR") {
        _setupRole(MINTER_ROLE, minter);
    }

    function mint(address account, uint256 amount) external returns (bool) {
        require(hasRole(MINTER_ROLE, msg.sender), "Caller is not a minter");
        _mint(account, amount);
        return true;
    }

    //Check if msg.snder is maintained
    function burn(uint256 amount) external returns (bool) {
        _burn(tx.origin, amount);
        return true;
    }
}
