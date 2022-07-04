// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/StateManager.sol";
import "./Core/interface/ICollectionManager.sol";
import "./IDelegator.sol";
import "./Core/parameters/ACL.sol";
import "./Core/storage/Constants.sol";
import "./Pause.sol";

/** @title Delegator
 * @notice Delegator acts as a bridge between the client and the protocol
 */

contract Delegator is ACL, StateManager, Pause, IDelegator {
    ICollectionManager public collectionManager;

    /// @inheritdoc IDelegator
    function updateAddress(address newDelegateAddress) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0), "Zero Address check");
        collectionManager = ICollectionManager(newDelegateAddress);
    }

    /// @inheritdoc IDelegator
    function getActiveCollections() external view override whenNotPaused returns (uint16[] memory) {
        return collectionManager.getActiveCollections();
    }

    /// @inheritdoc IDelegator
    function getCollectionStatus(uint16 _id) external view override whenNotPaused returns (bool) {
        return collectionManager.getCollectionStatus(_id);
    }

    /// @inheritdoc IDelegator
    function getCollectionID(bytes32 _hname) external view override whenNotPaused returns (uint16) {
        return collectionManager.getCollectionID(_hname);
    }

    /// @inheritdoc IDelegator
    function getResult(bytes32 _name) external view override whenNotPaused returns (uint256, int8) {
        return collectionManager.getResult(_name);
    }

    /// @inheritdoc IDelegator
    function getResultFromID(uint16 _id) external view override whenNotPaused returns (uint256, int8) {
        return collectionManager.getResultFromID(_id);
    }
}
