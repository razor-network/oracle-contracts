// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "../lib/Constants.sol";


contract StateManager {

    function getEpoch () external view returns(uint256) {
        return(block.number/(Constants.epochLength()));
    }

    function getState () external view returns(uint256) {
        uint256 state = (block.number/(Constants.epochLength()/Constants.numStates()));
        return (state%(Constants.numStates()));
    }
}
