pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "./SimpleToken.sol";
import "./Votes.sol";
import "./Blocks.sol";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/Constants.sol";
import "./lib/SharedStructs.sol";

contract States {
    using SafeMath for uint256;

    uint256 public EPOCH;
    uint256 public STATE;

    modifier checkEpoch (uint256 epoch) {
        require(epoch == getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == getState(), "incorrect state");
        _;
    }
    
    // WARNING TODO FOR TESTING ONLY. REMOVE IN PROD
    function setEpoch (uint256 epoch) public { EPOCH = epoch;}

    function setState (uint256 state) public { STATE = state;}

    // dummy function to forcibly increase block number in ganache
    function dum () public {true;}
    // END TESTING FUNCTIONS

    function getEpoch () public view returns(uint256) {
        return(EPOCH);
        return(block.number.div(Constants.epochLength()));
    }

    function getState () public view returns(uint256) {
        return (STATE);
        uint256 state = (block.number.div(Constants.epochLength()/Constants.numStates()));
        return (state.mod(Constants.numStates()));
    }


}