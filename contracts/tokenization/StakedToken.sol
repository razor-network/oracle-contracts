// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract StakedToken is ERC20 {
    struct fraction {
        uint256 numerator;
        uint256 denominator;
    }

    address private _owner;

    // quotient * sRZR gives amount of RZR invested by user for this much sRZR
    // hence at any time we can calcualte gain = current Rel * sRZRamount - quotient * sRZRamount
    mapping(address => fraction) public quotient; // quotient[delegatorAddress]

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    constructor(address stakeManagerAddress) ERC20("sRZR", "sRZR") {
        _owner = stakeManagerAddress;
    }

    function mint(address account, uint256 amount) external onlyOwner returns (bool) {
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) external onlyOwner returns (bool) {
        _burn(account, amount);
        return true;
    }

    /// @notice Used in stake, delegate
    /// Purpose is to maitain quotient
    function updateQuotient(
        address user,
        uint256 numAddition,
        uint256 denAddition
    ) external onlyOwner returns (bool) {
        quotient[user].numerator = quotient[user].numerator + numAddition;
        quotient[user].denominator = quotient[user].denominator + denAddition;
        return true;
    }

    /// @notice Used in withdraw
    // At any time via calling this one can find out how much RZR was invested for this much sRZR
    function getDelegatedAmount(address delegator, uint256 sAmount) external view returns (uint256) {
        return ((sAmount * quotient[delegator].numerator) / quotient[delegator].denominator);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        // Transfer Case
        if (from != address(0) && to != address(0)) {
            quotient[to].numerator = quotient[to].numerator + quotient[from].numerator;
            quotient[to].denominator = quotient[to].denominator + quotient[from].denominator;
        }
        // Condition to reset quotient, if user is not liable to commission now, this allows user to start fresh.
        // For Burn : When User withdraws everything
        // For Trasnfer : When User Transfer everything
        // This would run for Mint as well if balof(0x) is equal to amount, but it doesnt matter
        if (amount == balanceOf(from)) quotient[from] = fraction(0, 0);
    }
}
