// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StakedToken is ERC20, Ownable {
  
    constructor() ERC20("sRZR", "sRZR") {}

    function mint(address account, uint256 amount) external onlyOwner returns (bool) {
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) external onlyOwner returns (bool) {
        _burn(account, amount);
        return true;
    }
}
