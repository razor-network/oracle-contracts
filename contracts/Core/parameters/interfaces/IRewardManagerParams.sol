// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IRewardManagerParams {
    /**
     * @notice changing the percentage stake penalty to be given out for inactivity
     * @dev can be called only by the the address that has the governance role
     * @param _penaltyNotRevealNumerator updated value to be set for penaltyNotRevealNumerator
     */
    function setPenaltyNotRevealNum(uint32 _penaltyNotRevealNumerator) external;

    /**
     * @notice changing the percentage age penalty to be given out for inactivity
     * @dev can be called only by the the address that has the governance role
     * @param _penaltyAgeNotRevealNumerator updated value to be set for penaltyAgeNotRevealNumerator
     */
    function setPenaltyAgeNotRevealNum(uint32 _penaltyAgeNotRevealNumerator) external;

    /**
     * @notice changing the block reward given out to stakers
     * @dev can be called only by the the address that has the governance role
     * @param _blockReward updated value to be set for blockReward
     */
    function setBlockReward(uint256 _blockReward) external;

    /**
     * @notice changing the maximum age a staker can have
     * @dev can be called only by the the address that has the governance role
     * @param _maxAge updated value to be set for maxAge
     */
    function setMaxAge(uint32 _maxAge) external;

    /**
     * @notice changing the maximum percentage deviation allowed from medians for all collections
     * @dev can be called only by the the address that has the governance role
     * @param _maxTolerance updated value for maxTolerance
     */
    function setMaxTolerance(uint32 _maxTolerance) external;

    /**
     * @notice changing maximum commission stakers can charge from delegators on their profits
     * @dev can be called only by the the address that has the governance role
     * @param _maxCommission updated value to be set for maxCommission
     */
    function setMaxCommission(uint8 _maxCommission) external;
}
