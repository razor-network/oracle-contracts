// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./storage/Constants.sol";

/** @title StateManager
 * @notice StateManager manages the state of the network
 */

contract StateManager is Constants {
    /**
     * @notice a check to ensure the epoch value sent in the function is of the currect epoch
     */
    modifier checkEpoch(uint32 epoch) {
        // slither-disable-next-line incorrect-equality
        require(epoch == getEpoch(), "incorrect epoch");
        _;
    }

    /**
     * @notice a check to ensure the function was called in the state specified
     */
    modifier checkState(State state, uint8 buffer) {
        // slither-disable-next-line incorrect-equality
        require(state == getState(buffer), "incorrect state");
        _;
    }

    /**
     * @notice a check to ensure the function was not called in the state specified
     */
    modifier notState(State state, uint8 buffer) {
        // slither-disable-next-line incorrect-equality
        require(state != getState(buffer), "incorrect state");
        _;
    }

    /** @notice a check to ensure the epoch value sent in the function is of the currect epoch
     * and was called in the state specified
     */
    modifier checkEpochAndState(
        State state,
        uint32 epoch,
        uint8 buffer
    ) {
        // slither-disable-next-line incorrect-equality
        require(epoch == getEpoch(), "incorrect epoch");
        // slither-disable-next-line incorrect-equality
        require(state == getState(buffer), "incorrect state");
        _;
    }

    /**
     * @return the value of current epoch
     */
    function getEpoch() public view returns (uint32) {
        return (uint32(block.timestamp) / (EPOCH_LENGTH));
    }

    /**
     * @return the value of current state
     */
    function getState(uint8 buffer) public view returns (State) {
        uint8 lowerLimit = buffer;

        uint16 upperLimit = EPOCH_LENGTH / NUM_STATES - buffer;
        // slither-disable-next-line timestamp,weak-prng
        if (block.timestamp % (EPOCH_LENGTH / NUM_STATES) > upperLimit || block.timestamp % (EPOCH_LENGTH / NUM_STATES) < lowerLimit) {
            return State.Buffer;
        }
        // slither-disable-next-line timestamp,weak-prng
        uint8 state = uint8(((block.timestamp) / (EPOCH_LENGTH / NUM_STATES)) % (NUM_STATES));
        return State(state);
    }
}
