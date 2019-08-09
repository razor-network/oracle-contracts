pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "../lib/Constants.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../SimpleToken.sol";
// import "../lib/Structs.sol";


contract Utils {
    using SafeMath for uint256;

    event DebugUint256(uint256 a);

    // constructor(address _schAddress) public {
    //     sch = SimpleToken(_schAddress);
    // }
    modifier checkEpoch (uint256 epoch) {
        require(epoch == getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == getState(), "incorrect state");
        _;
    }

    function getEpoch () public view returns(uint256) {
        // return(EPOCH);
        return(block.number.div(Constants.epochLength()));
    }

    function getState () public view returns(uint256) {
        // return (STATE);
        uint256 state = (block.number.div(Constants.epochLength()/Constants.numStates()));
        return (state.mod(Constants.numStates()));
    }

        // internal functions vvvvvvvv
        //gives penalties for:
        // 2. not committing
        // 3. not revealing
        // 1. giving vting outside consensus
        //executed in state 0


    // //executed in state 1


}
