// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/StateManager.sol";
import "./Core/interface/IAssetManager.sol";
import "./Core/interface/IBlockManager.sol";
import "./IDelegator.sol";
import "./Core/parameters/child/DelegatorParams.sol";
import "./Core/storage/Constants.sol";

contract Delegator is StateManager, DelegatorParams, IDelegator {
    mapping(bytes32 => uint16) public ids;

    IAssetManager public assetManager;
    IBlockManager public blockManager;

    function updateAddress(address newDelegateAddress, address newResultAddress) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0), "Zero Address check");
        require(newResultAddress != address(0x0), "Zero Address check");
        assetManager = IAssetManager(newDelegateAddress);
        blockManager = IBlockManager(newResultAddress);
    }

    function setIDName(string calldata name, uint16 _id) external override onlyRole(DELEGATOR_MODIFIER_ROLE) {
        bytes32 _name = keccak256(abi.encodePacked(name));
        require(ids[_name] == 0, "Similar collection exists");
        ids[_name] = _id;
    }

    function getNumActiveCollections() external view override returns (uint256) {
        return assetManager.getNumActiveCollections();
    }

    function getActiveCollections() external view override returns (uint16[] memory) {
        return assetManager.getActiveCollections();
    }

    function getResult(bytes32 _name) external view override returns (uint32, int8) {
        uint16 index = assetManager.getCollectionIndex(ids[_name]);
        uint32 epoch = _getEpoch(epochLength);
        uint32[] memory medians = blockManager.getBlock(epoch - 1).medians;
        int8 power = assetManager.getCollectionPower(ids[_name]);
        return (medians[index - 1], power);
    }
}
