pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "../lib/Constants.sol";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";


contract StateManager {
    using SafeMath for uint256;
    // for testing only. diable in prod
    // uint256 public EPOCH;
    // uint256 public STATE;
    //
    // function setEpoch (uint256 epoch) external { EPOCH = epoch;}
    //
    // function setState (uint256 state) external { STATE = state;}

    function getEpoch () external view returns(uint256) {
        // return(EPOCH);
        return(block.number.div(Constants.epochLength()));
    }

    function getState () external view returns(uint256) {
        // return (STATE);
        uint256 state = (block.number.div(Constants.epochLength()/Constants.numStates()));
        return (state.mod(Constants.numStates()));
    }
}
