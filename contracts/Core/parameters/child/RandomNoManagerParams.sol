// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IRandomNoManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract RandomNoManagerParams is GovernanceACL, IRandomNoManagerParams {
    uint16 public epochLength = 300;

    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        // slither-disable-next-line missing-events-arithmetic
        epochLength = _epochLength;
    }
}
