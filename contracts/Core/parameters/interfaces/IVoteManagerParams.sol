// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVoteManagerParams {
    /**
     * @notice changing minimum amount that to be staked for participation
     * @dev can be called only by the the address that has the governance role
     * @param _minStake updated value to be set for minStake
     */
    function setMinStake(uint256 _minStake) external;

    /**
     * @notice changing maximum number of collections that can be assigned to the staker
     * @dev can be called only by the the address that has the governance role
     * @param _toAssign updated value to be set for toAssign
     */
    function setToAssign(uint16 _toAssign) external;

    /**
     * @notice changing buffer length between the states
     * @dev can be called only by the the address that has the governance role
     * @param _bufferLength updated value to be set for buffer
     */
    function setBufferLength(uint8 _bufferLength) external;

    /**
     * @notice changing epoch length
     * @dev can be called only by the the address that has the governance role
     * @param _epochLength updated value to be set for epoch
     */
    function setEpochLength(uint16 _epochLength) external;
}
