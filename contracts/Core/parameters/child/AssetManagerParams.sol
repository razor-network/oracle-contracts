// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IAssetManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract AssetManagerParams is GovernanceACL, IAssetManagerParams {
    uint16 public epochLength = 300;

    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line missing-events-arithmetic
        epochLength = _epochLength;
    }
}
