pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
// import "../lib/Structs.sol";


contract IStateManager {
    // for testing only. diable in prod
    function setEpoch (uint256 epoch) external;

    function setState (uint256 state) external;

    function getEpoch () external view returns(uint256);

    function getState () external view returns(uint256);
}
