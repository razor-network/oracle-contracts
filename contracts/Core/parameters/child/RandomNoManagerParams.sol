// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRandomNoManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract RandomNoManagerParams is ACL, IRandomNoManagerParams, Constants {
    uint16 public epochLength = 300;

    function setEpochLength(uint16 _epochLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        epochLength = _epochLength;
    }
}
