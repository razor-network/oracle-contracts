// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/ICollectionManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract CollectionManagerParams is ACL, ICollectionManagerParams, Constants {
    /// @notice maximum percentage deviation allowed from medians for all collections
    // slither-disable-next-line too-many-digits
    uint32 public maxTolerance = 1000000;

    /// @inheritdoc ICollectionManagerParams
    function setMaxTolerance(uint32 _maxTolerance) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        maxTolerance = _maxTolerance;
    }
}
