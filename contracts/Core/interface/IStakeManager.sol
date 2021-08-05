// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IStakeManager {
    function updateCommitmentEpoch(uint32 stakerId) external;

    function stake(uint32 epoch, uint256 amount) external;

    function delegate(
        uint32 epoch,
        uint256 amount,
        uint32 stakerId
    ) external;

    function unstake(uint32 epoch) external;

    function withdraw(uint32 epoch) external;

    function setDelegationAcceptance(bool status) external;

    function setCommission(uint256 commission) external;

    function decreaseCommission(uint256 commission) external;

    function resetLock(uint32 stakerId) external;

    function setStakerStake(
        uint32 _id,
        uint256 _stake,
        string memory _reason,
        uint32 _epoch
    ) external;

    function slash(
        uint32 stakerId,
        address bountyHunter,
        uint32 epoch
    ) external;

    function setStakerAge(
        uint32 _id,
        uint256 _age,
        uint32 _epoch
    ) external;

    function escape(address _address) external;

    function getStakerId(address _address) external view returns (uint32);

    function getStaker(uint32 _id) external view returns (Structs.Staker memory staker);

    function getNumStakers() external view returns (uint32);

    function getAge(uint32 stakerId) external view returns (uint256);

    function getInfluence(uint32 stakerId) external view returns (uint256);

    function getStake(uint32 stakerId) external view returns (uint256);

    function getEpochStaked(uint32 stakerId) external view returns (uint32);
}
