// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./storage/Constants.sol";

contract StateManager is Constants {
    /// @notice a check to ensure the epoch value sent in the function is of the currect epoch
    modifier checkEpoch(uint32 epoch) {
        // slither-disable-next-line incorrect-equality
        require(epoch == _getEpoch(), "incorrect epoch");
        _;
    }

    /// @notice a check to ensure the function was called in the state specified
    modifier checkState(State state) {
        // slither-disable-next-line incorrect-equality
        require(state == _getState(), "incorrect state");
        _;
    }

    /// @notice a check to ensure the function was not called in the state specified
    modifier notState(State state) {
        // slither-disable-next-line incorrect-equality
        require(state != _getState(), "incorrect state");
        _;
    }

    /// @notice a check to ensure the epoch value sent in the function is of the currect epoch
    /// and was called in the state specified
    modifier checkEpochAndState(State state, uint32 epoch) {
        // slither-disable-next-line incorrect-equality
        require(epoch == _getEpoch(), "incorrect epoch");
        // slither-disable-next-line incorrect-equality
        require(state == _getState(), "incorrect state");
        _;
    }

    function _getEpoch() internal view returns (uint32) {
        return (uint32(block.number) / (EPOCH_LENGTH));
    }

    function _getState() internal view returns (State) {
        uint8 state = uint8(((block.number) / (EPOCH_LENGTH / NUM_STATES)) % (NUM_STATES));
        return State(state);
    }
}
