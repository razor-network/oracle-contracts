// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IStakedToken.sol";

interface IStakeManager {
    function getStake(uint32 stakerId) external view returns (uint256);
}

contract StakedToken is ERC20, IStakedToken {
    address private _owner;
    uint32 public stakerID;
    IStakeManager public stakeManager;

    // Mapping to store the amount of RZR delegated or staked by user
    // hence at any time we can calculate gain = (current Rel * sRZRamount) -  ((razorPutIn/balOfsRZR()) * sRZRamount)
    // razorPutIn/balOfsRZR() indicates, for 1 sRZR, how much you had put in

    mapping(address => uint256) public razorPutIn;

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    constructor(address stakeManagerAddress, uint32 _stakerID) ERC20("sRZR", "sRZR") {
        _owner = stakeManagerAddress;
        stakeManager = IStakeManager(stakeManagerAddress);
        stakerID = _stakerID;
    }

    function mint(address account, uint256 amount) external override onlyOwner returns (bool) {
        _mint(account, amount);
        return true;
    }

    function burn(address account, uint256 amount) external override onlyOwner returns (bool) {
        _burn(account, amount);
        return true;
    }

    /// @notice Used in withdraw
    // At any time via calling this one can find out how much RZR was invested for this much sRZR
    function getRZRPutIn(address user, uint256 sAmount) public view override returns (uint256) {
        require(balanceOf(user) >= sAmount, "Amount Exceeds Balance");
        return ((sAmount * razorPutIn[user]) / balanceOf(user));
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        //mint : addition, would happen in case of delegate or stake
        //burn : subtraction, would happeen when staker calls withdraw
        //transfer : add and sub

        // Convert sRZR to RZR

        if (from == address(0)) {
            // Mint
            uint256 currentStake = stakeManager.getStake(stakerID);
            uint256 totalsRZR = totalSupply();
            uint256 razorAdded;

            if (totalsRZR == 0) razorAdded = amount;
            else razorAdded = (amount * currentStake) / totalsRZR;
            razorPutIn[to] = razorPutIn[to] + razorAdded;
        } else if (to == address(0)) {
            //Burn
            uint256 propotionalRazorContribution = getRZRPutIn(from, amount);
            razorPutIn[from] = razorPutIn[from] - propotionalRazorContribution;
        } else {
            uint256 propotionalRazorContribution = getRZRPutIn(from, amount);
            razorPutIn[from] = razorPutIn[from] - propotionalRazorContribution;
            razorPutIn[to] = razorPutIn[to] + propotionalRazorContribution;
        }
    }
}
