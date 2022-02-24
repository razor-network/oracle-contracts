// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/StateManager.sol";
import "./Core/interface/ICollectionManager.sol";
import "./IDelegator.sol";
import "./Core/parameters/ACL.sol";
import "./Core/storage/Constants.sol";

/** @title Delegator
 * @notice Delegator acts as a bridge between the client and the protocol
 */

contract Delegator is StateManager, ACL, IDelegator {
    ICollectionManager public collectionManager;

    /// @inheritdoc IDelegator
    function updateAddress(address newDelegateAddress) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0), "Zero Address check");
        collectionManager = ICollectionManager(newDelegateAddress);
    }

    /// @inheritdoc IDelegator
    function getNumActiveCollections() external view override returns (uint256) {
        return collectionManager.getNumActiveCollections();
    }

    /// @inheritdoc IDelegator
    function getCollectionID(bytes32 _hname) external view override returns (uint16) {
        return collectionManager.getCollectionID(_hname);
    }

    /// @inheritdoc IDelegator
    function getResult(bytes32 _name) external view override returns (uint32, int8) {
        return collectionManager.getResult(_name);
    }

    /// @inheritdoc IDelegator
    function getResultFromID(uint16 _id) external view override returns (uint32, int8) {
        return collectionManager.getResultFromID(_id);
    }
}
