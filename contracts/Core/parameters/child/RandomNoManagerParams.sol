// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRandomNoManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract RandomNoManagerParams is GovernanceACL, IRandomNoManagerParams {
    uint16 public epochLength = 300;

    // slither-disable-next-line missing-events-arithmetic
    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        epochLength = _epochLength;
    }
}
