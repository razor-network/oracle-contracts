// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../lib/Constants.sol";




contract StateManager {
 
    // for testing only. diable in prod
    // uint256 public EPOCH;
    // uint256 public STATE;
    //
    // function setEpoch (uint256 epoch) external { EPOCH = epoch;}
    //
    // function setState (uint256 state) external { STATE = state;}

    function getEpoch () external view returns(uint256) {
        // return(EPOCH);
        return(block.number/(Constants.epochLength()));
    }

    function getState () external view returns(uint256) {
        // return (STATE);
        uint256 state = (block.number/(Constants.epochLength()/Constants.numStates()));
        return (state%(Constants.numStates()));
    }
}
