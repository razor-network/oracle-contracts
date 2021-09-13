// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IStakeManager {
    function stake(uint32 epoch, uint256 amount) external;

    function delegate(
        uint32 epoch,
        uint32 stakerId,
        uint256 amount
    ) external;

    function unstake(uint32 epoch, uint32 stakerId, uint256 sAmount) external;

    function withdraw(uint32 epoch, uint32 stakerId) external;

    function setDelegationAcceptance(bool status) external;

    function setCommission(uint8 commission) external;

    function decreaseCommission(uint8 commission) external;

    function resetLock(uint32 stakerId) external;

    function setStakerStake(
        uint32 _epoch,
        uint32 _id,
        uint256 _stake
    ) external;

    function slash(
        uint32 epoch,
        uint32 stakerId,
        address bountyHunter
    ) external;

    function setStakerAge(
        uint32 _epoch,
        uint32 _id,
        uint32 _age
    ) external;

    function escape(address _address) external;

    function getStakerId(address _address) external view returns (uint32);

    function getStaker(uint32 _id) external view returns (Structs.Staker memory staker);

    function getNumStakers() external view returns (uint32);

    function getAge(uint32 stakerId) external view returns (uint32);

    function getInfluence(uint32 stakerId) external view returns (uint256);

    function getStake(uint32 stakerId) external view returns (uint256);

    function getEpochLastUnstakedOrFirstStaked(uint32 stakerId) external view returns (uint32);
}
