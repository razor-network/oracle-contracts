// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./IStakedToken.sol";
import "../Core/interface/IStakeManager.sol";

contract StakedToken is ERC20, IStakedToken {
    address private _owner;
    uint32 public stakerID;
    IStakeManager public stakeManager;

    /**
     * @notice Mapping to store the amount of RZR delegated or staked by user
     * hence at any time we can calculate gain = (current Rel * sRZRamount) -  ((razorDeposited/balOfsRZR()) * sRZRamount)
     * razorDeposited/balOfsRZR() indicates, for 1 sRZR, how much you had put in
     */

    mapping(address => uint256) public razorDeposited;

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev unique ERC20 sToken contract is deployed for every new staker that stakes into the protocol
     * @param stakeManagerAddress address of the stake manager contract
     * @param _stakerID the id of staker for whom the sToken is being deployed
     */
    constructor(address stakeManagerAddress, uint32 _stakerID) ERC20("sRZR", "sRZR") {
        require(stakeManagerAddress != address(0), "zero Address Check");
        _owner = stakeManagerAddress;
        stakeManager = IStakeManager(stakeManagerAddress);
        stakerID = _stakerID;
    }

    /// @inheritdoc IStakedToken
    function mint(
        address account,
        uint256 amount,
        uint256 _razorDeposited
    ) external override onlyOwner returns (bool) {
        razorDeposited[account] = razorDeposited[account] + _razorDeposited;
        _mint(account, amount);
        return true;
    }

    /// @inheritdoc IStakedToken
    function burn(address account, uint256 amount) external override onlyOwner returns (bool) {
        _burn(account, amount);
        return true;
    }

    /// @inheritdoc IStakedToken
    function getRZRDeposited(address user, uint256 sAmount) public view override returns (uint256) {
        require(balanceOf(user) >= sAmount, "Amount Exceeds Balance");
        return ((sAmount * razorDeposited[user]) / balanceOf(user));
    }

    /**
     * @dev an internal function that handles the amount os razor deposited based on sRZR token transfer.
     * If sRZR is transferred from to another account, razor deposited should also be transferred
     * @param from address from where sRZR is being transferred from
     * @param to address where sRZR is being transferred to
     * @param amount amount sRZR being transferred
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        //mint : addition, would happen in case of delegate or stake
        //burn : subtraction, would happeen when staker calls withdraw
        //transfer : add and sub

        // Mint case is handled up only

        if (to == address(0)) {
            //Burn
            uint256 propotionalRazorContribution = getRZRDeposited(from, amount);
            razorDeposited[from] = razorDeposited[from] - propotionalRazorContribution;
        } else if (from != address(0)) {
            uint256 propotionalRazorContribution = getRZRDeposited(from, amount);
            razorDeposited[from] = razorDeposited[from] - propotionalRazorContribution;
            razorDeposited[to] = razorDeposited[to] + propotionalRazorContribution;
        }

        stakeManager.srzrTransfer(from, to, amount, stakerID);
    }
}
