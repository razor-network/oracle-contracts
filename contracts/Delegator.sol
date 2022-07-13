// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/StateManager.sol";
import "./Core/interface/ICollectionManager.sol";
import "./IDelegator.sol";
import "./randomNumber/IRandomNoClient.sol";
import "./Core/parameters/ACL.sol";
import "./Core/storage/Constants.sol";
import "./Pause.sol";

/** @title Delegator
 * @notice Delegator acts as a bridge between the client and the protocol
 */

contract Delegator is ACL, StateManager, Pause, IDelegator {
    ICollectionManager public collectionManager;
    IRandomNoClient public randomNoManager;

    /// @inheritdoc IDelegator
    function updateAddress(address newDelegateAddress, address newRandomNoManagerAddress) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0) && newRandomNoManagerAddress != address(0x0), "Zero Address check");
        collectionManager = ICollectionManager(newDelegateAddress);
        randomNoManager = IRandomNoClient(newRandomNoManagerAddress);
    }

    /// @inheritdoc IDelegator
    function register() external override whenNotPaused returns (bytes32) {
        return randomNoManager.register();
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

    /// @inheritdoc IDelegator
    function getRandomNumber(bytes32 requestId) external view override whenNotPaused returns (uint256) {
        return randomNoManager.getRandomNumber(requestId);
    }

    /// @inheritdoc IDelegator
    function getGenericRandomNumberOfLastEpoch() external view override whenNotPaused returns (uint256) {
        return randomNoManager.getGenericRandomNumberOfLastEpoch();
    }

    /// @inheritdoc IDelegator
    function getGenericRandomNumber(uint32 _epoch) external view override whenNotPaused returns (uint256) {
        return randomNoManager.getGenericRandomNumber(_epoch);
    }
}
