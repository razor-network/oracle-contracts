pragma solidity 0.5.10;
import "../lib/Constants.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../SimpleToken.sol";


contract Utils {
    using SafeMath for uint256;

    // Constants public constants;

    event DebugUint256(uint256 a);

    SimpleToken public sch = SimpleToken(0x0);

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
}
