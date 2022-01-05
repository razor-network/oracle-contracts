// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/ICollectionManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract CollectionManagerParams is ACL, ICollectionManagerParams, Constants {
    uint16 public epochLength = 300;

    function setEpochLength(uint16 _epochLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        epochLength = _epochLength;
    }
}
