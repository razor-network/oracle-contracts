// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../storage/Constants.sol";
import 'hardhat/console.sol';
/** @title StateManager
 * @notice StateManager manages the state of the network
 */

abstract contract StateManager is Constants {
    // @notice epoch = offset + (currentTimeStamp - timeStampOfCurrentEpochLengthUpdate)/ epochLength
    uint32 public timeStampOfCurrentEpochLengthUpdate = 0;
    uint32 public offset = 0;
    uint16 public epochLength = 1800;
    uint8 public buffer = 5;

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
    modifier checkState(State state) {
        // slither-disable-next-line incorrect-equality
        require(state == getState(), "incorrect state");
        _;
    }

    /**
     * @notice a check to ensure the function was not called in the state specified
     */
    modifier notState(State state) {
        // slither-disable-next-line incorrect-equality
        require(state != getState(), "incorrect state");
        _;
    }

    /** @notice a check to ensure the epoch value sent in the function is of the currect epoch
     * and was called in the state specified
     */
    modifier checkEpochAndState(State state, uint32 epoch) {
        // slither-disable-next-line incorrect-equality
        require(epoch == getEpoch(), "incorrect epoch");
        // slither-disable-next-line incorrect-equality
        require(state == getState(), "incorrect state");
        _;
    }

    function getEpoch() public view returns (uint32) {
        return offset + uint32(block.timestamp - timeStampOfCurrentEpochLengthUpdate) / epochLength;
    }


    // "Version" + "Epoch"
    //              uint32
    //  000000010000000001 1
    //  000000010000000010 2
    //  000000010000000011 3
    //  000000010000000100 4
    //  000000010000001001 5

    //  update epochlength

    //  000000020000001010 can be 6 or anything depending, but collision wont happen
    //  000000020000001011 
    //  000000020000010000 
    //  000000020000010001 

    function getState() public view returns (State) {
        uint8 lowerLimit = buffer;
        uint16 upperLimit = (epochLength / NUM_STATES) - buffer;
        uint256 timeStamp;

        if (block.timestamp <= timeStampOfCurrentEpochLengthUpdate + (epochLength / NUM_STATES)) {
            timeStamp = block.timestamp - timeStampOfCurrentEpochLengthUpdate + 4 * (epochLength / NUM_STATES);
            console.log(block.timestamp, timeStampOfCurrentEpochLengthUpdate);
        } else {
            timeStamp = block.timestamp;
            console.log(timeStamp);
        }

        // slither-disable-next-line timestamp,weak-prng
        if (timeStamp % (epochLength / NUM_STATES) > upperLimit || timeStamp % (epochLength / NUM_STATES) < lowerLimit) {
            return State.Buffer;
        }
        // slither-disable-next-line timestamp,weak-prng
        uint8 state = uint8((timeStamp / (epochLength / NUM_STATES)) % (NUM_STATES));
        return State(state);
    }
}
