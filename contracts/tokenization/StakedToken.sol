// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IStakedToken.sol";

contract StakedToken is ERC20, IStakedToken {
    address private _owner;

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    constructor(address stakeManagerAddress) ERC20("sRZR", "sRZR") {
        _owner = stakeManagerAddress;
    }

    function mint(address account, uint256 amount) external override onlyOwner returns (bool) {
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) external override onlyOwner returns (bool) {
        _burn(account, amount);
        return true;
    }
}
