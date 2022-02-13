// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/StateManager.sol";
import "./Core/interface/ICollectionManager.sol";
import "./Core/interface/IBlockManager.sol";
import "./IDelegator.sol";
import "./Core/parameters/ACL.sol";
import "./Core/storage/Constants.sol";

contract Delegator is StateManager, ACL, IDelegator {
    mapping(bytes32 => uint16) public ids;

    ICollectionManager public collectionManager;
    IBlockManager public blockManager;

    function updateAddress(address newDelegateAddress, address newResultAddress) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0), "Zero Address check");
        require(newResultAddress != address(0x0), "Zero Address check");
        collectionManager = ICollectionManager(newDelegateAddress);
        blockManager = IBlockManager(newResultAddress);
    }

    function setIDName(string calldata name, uint16 _id) external override onlyRole(DELEGATOR_MODIFIER_ROLE) {
        bytes32 _name = keccak256(abi.encodePacked(name));
        ids[_name] = _id;
    }

    function getNumActiveCollections() external view override returns (uint256) {
        return collectionManager.getNumActiveCollections();
    }

    function getResult(bytes32 _name) external view override returns (uint32, int8) {
        uint16 index = collectionManager.getIdToIndexRegistryValue(ids[_name]);
        uint32 epoch = _getEpoch();
        uint32[] memory medians = blockManager.getBlock(epoch - 1).medians;
        int8 power = collectionManager.getCollectionPower(ids[_name]);
        return (medians[index - 1], power);
    }

    function getResultFromID(uint16 _id) external view override returns (uint32, int8) {
        uint16 index = collectionManager.getIdToIndexRegistryValue(_id);
        uint32 epoch = _getEpoch();
        uint32[] memory medians = blockManager.getBlock(epoch - 1).medians;
        int8 power = collectionManager.getCollectionPower(_id);
        return (medians[index - 1], power);
    }
}
