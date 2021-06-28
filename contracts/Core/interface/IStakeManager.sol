// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IStakeManager {

    function setStakerEpochLastRevealed(uint256 _id, uint256 _epochLastRevealed) external;
    function updateCommitmentEpoch(uint256 stakerId) external;
    function stake (uint256 epoch, uint256 amount) external;
    function delegate(uint256 epoch, uint256 amount, uint256 stakerId) external;
    function unstake (uint256 epoch) external;
    function withdraw (uint256 epoch) external;
    function setDelegationAcceptance(bool status) external;
    function setCommission(uint256 commission) external;
    function decreaseCommission(uint256 commission) external;
    function resetLock(uint256 stakerId) external;
    function setStakerStake(uint256 _id, uint256 _stake, string memory _reason, uint256 _epoch) external;
    function transferBounty(address bountyHunter, uint256 halfStake) external;
    function getStakerId(address _address) external view returns(uint256);
    function getStaker(uint256 _id) external view returns(Structs.Staker memory staker);
    function getNumStakers() external view returns(uint256);
}
