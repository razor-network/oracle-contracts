// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
// import "../lib/Structs.sol";


abstract contract IStateManager {
    // for testing only. diable in prod
    function setEpoch (uint256 epoch) external virtual;

    function setState (uint256 state) external virtual;

    function getEpoch () external virtual view returns(uint256);

    function getState () external virtual view returns(uint256);
}
