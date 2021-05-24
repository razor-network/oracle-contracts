// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IStakeManager {

    function setStakerEpochLastRevealed(uint256 _id, uint256 _epochLastRevealed) external;
    function updateCommitmentEpoch(uint256 stakerId) external;
    function stake (uint256 epoch, uint256 amount) external;
    function unstake (uint256 epoch) external;
    function withdraw (uint256 epoch) external;
    function givePenalties (uint256 stakerId, uint256 epoch) external;
    function giveBlockReward(uint256 stakerId, uint256 epoch) external;
    function giveRewards (uint256 stakerId, uint256 epoch) external;
    function slash (uint256 id, address bountyHunter, uint256 epoch) external;
    function getStakerId(address _address) external view returns(uint256);
    function getStaker(uint256 _id) external view returns(Structs.Staker memory staker);
    function getNumStakers() external view returns(uint256);
    function getRewardPool() external view returns(uint256);
    function getStakeGettingReward() external view returns(uint256);
}
