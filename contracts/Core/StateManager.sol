// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./storage/Constants.sol";

contract StateManager is Constants {
    modifier checkEpoch(uint32 epoch, uint32 epochLength) {
        require(epoch == getEpoch(epochLength), "incorrect epoch");
        _;
    }

    modifier checkState(uint32 epochLength, State state) {
        require(state == getState(epochLength), "incorrect state");
        _;
    }

    modifier checkEpochAndState(
        uint32 epoch,
        uint32 epochLength,
        State state
    ) {
        require(epoch == getEpoch(epochLength), "incorrect epoch");
        require(state == getState(epochLength), "incorrect state");
        _;
    }

    function getEpoch(uint32 epochLength) public view returns (uint32) {
        return (uint32(block.number) / (epochLength));
    }

    function getState(uint32 epochLength) public view returns (State) {
        uint8 state = uint8(((block.number) / (epochLength / NUM_STATES)));
        return State(state % (NUM_STATES));
    }
}
