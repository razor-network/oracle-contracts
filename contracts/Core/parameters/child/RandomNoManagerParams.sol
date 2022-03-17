// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRandomNoManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract RandomNoManagerParams is ACL, IRandomNoManagerParams, Constants {
    uint8 public buffer = 5;
    uint16 public epochLength = 1800;

    function setBufferLength(uint8 _bufferLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        buffer = _bufferLength;
    }

    function setEpochLength(uint16 _epochLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        epochLength = _epochLength;
    }
}
