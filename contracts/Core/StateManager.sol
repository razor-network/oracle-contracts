// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./storage/Constants.sol";

contract StateManager is Constants {
    modifier checkEpoch(uint32 epoch, uint32 epochLength) {
        // slither-disable-next-line incorrect-equality
        require(epoch == _getEpoch(epochLength), "incorrect epoch");
        _;
    }

    modifier checkState(State state, uint32 epochLength) {
        // slither-disable-next-line incorrect-equality
        require(state == _getState(epochLength), "incorrect state");
        _;
    }

    modifier notState(State state, uint32 epochLength) {
        // slither-disable-next-line incorrect-equality
        require(state != _getState(epochLength), "incorrect state");
        _;
    }

    modifier checkEpochAndState(
        State state,
        uint32 epoch,
        uint32 epochLength
    ) {
        // slither-disable-next-line incorrect-equality
        require(epoch == _getEpoch(epochLength), "incorrect epoch");
        // slither-disable-next-line incorrect-equality
        require(state == _getState(epochLength), "incorrect state");
        _;
    }

    function _getEpoch(uint32 epochLength) internal view returns (uint32) {
        return (uint32(block.timestamp) / (epochLength));
    }

    function _getState(uint32 epochLength) internal view returns (State) {
        uint8 state = uint8(((block.timestamp) / (epochLength / NUM_STATES)) % (NUM_STATES));
        return State(state);
    }
}
