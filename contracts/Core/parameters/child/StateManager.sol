// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../storage/Constants.sol";

/** @title StateManager
 * @notice StateManager manages the state of the network
 */

abstract contract StateManager is Constants {

    // @notice epoch = offset + (currentTimeStamp - timeStampOfCurrentEpochLengthUpdate)/ epochLength
    uint32 public timeStampOfCurrentEpochLengthUpdate = 0 ;
    uint32 public offset = 0;
    uint16 public epochLength = 1800;
    uint8 public buffer = 5;

    /**
     * @notice a check to ensure the epoch value sent in the function is of the currect epoch
     */
    modifier checkEpoch(uint32 epoch) {
        // slither-disable-next-line incorrect-equality
        require(epoch == _getEpoch(), "incorrect epoch");
        _;
    }

    /**
     * @notice a check to ensure the function was called in the state specified
     */
    modifier checkState(
        State state
    ) {
        // slither-disable-next-line incorrect-equality
        require(state == _getState(), "incorrect state");
        _;
    }

    /**
     * @notice a check to ensure the function was not called in the state specified
     */
    modifier notState(
        State state
    ) {
        // slither-disable-next-line incorrect-equality
        require(state != _getState(), "incorrect state");
        _;
    }

    /** @notice a check to ensure the epoch value sent in the function is of the currect epoch
     * and was called in the state specified
     */
    modifier checkEpochAndState(
        State state,
        uint32 epoch
    ) {
        // slither-disable-next-line incorrect-equality
        require(epoch == _getEpoch(), "incorrect epoch");
        // slither-disable-next-line incorrect-equality
        require(state == _getState(), "incorrect state");
        _;
    }

    function _getEpoch() internal view returns (uint32) { 
        return offset + uint32(block.timestamp - timeStampOfCurrentEpochLengthUpdate)/ epochLength;
    }

    function _getState() internal view returns (State) {
        uint8 lowerLimit = buffer;

        uint8 upperLimit = uint8(epochLength / NUM_STATES) - buffer;
        // slither-disable-next-line timestamp,weak-prng
        if (block.timestamp % (epochLength / NUM_STATES) > upperLimit || block.timestamp % (epochLength / NUM_STATES) < lowerLimit) {
            return State.Buffer;
        }
        // slither-disable-next-line timestamp,weak-prng
        uint8 state = uint8(((block.timestamp) / (epochLength / NUM_STATES)) % (NUM_STATES));
        return State(state);
    }
}
