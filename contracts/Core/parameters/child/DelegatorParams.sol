// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IDelegatorParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract DelegatorParams is GovernanceACL, IDelegatorParams {
    uint16 public epochLength = 300;

    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        // slither-disable-next-line events-access
        epochLength = _epochLength;
    }
}
