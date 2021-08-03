// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

interface IStakeManager {
    function setStakerEpochLastRevealed(uint256 _id, uint32 _epochLastRevealed) external;

    function updateCommitmentEpoch(uint256 stakerId) external;

    function stake(uint32 epoch, uint256 amount) external;

    function delegate(
        uint32 epoch,
        uint256 amount,
        uint256 stakerId
    ) external;

    function unstake(uint32 epoch) external;

    function withdraw(uint32 epoch) external;

    function setDelegationAcceptance(bool status) external;

    function setCommission(uint256 commission) external;

    function decreaseCommission(uint256 commission) external;

    function resetLock(uint256 stakerId) external;

    function setStakerStake(
        uint256 _id,
        uint256 _stake,
        string memory _reason,
        uint32 _epoch
    ) external;

    function slash(
        uint256 id,
        address bountyHunter,
        uint32 epoch
    ) external;

    function setStakerAge(
        uint256 _id,
        uint256 _age,
        uint32 _epoch
    ) external;

    function escape(address _address) external;

    function getStakerId(address _address) external view returns (uint256);

    function getStaker(uint256 _id) external view returns (Structs.Staker memory staker);

    function getNumStakers() external view returns (uint256);

    function getAge() external view returns (uint256);

    function getInfluence(uint256 stakerId) external view returns (uint256);

    function getStake(uint256 stakerId) external view returns (uint256);

}
