// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/StateManager.sol";
import "./Core/interface/IAssetManager.sol";
import "./Core/interface/IBlockManager.sol";
import "./IDelegator.sol";
import "./Core/parameters/child/DelegatorParams.sol";
import "./Core/storage/Constants.sol";
import "./Core/ACL.sol";

contract Delegator is ACL, StateManager, DelegatorParams, IDelegator {
    mapping(bytes32 => uint8) public ids;

    IAssetManager public assetManager;
    IBlockManager public blockManager;

    function updateAddress(
        address newDelegateAddress,
        address newResultAddress,
        address governanceAddress
    ) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0), "Zero Address check");
        require(newResultAddress != address(0x0), "Zero Address check");
        require(governanceAddress != address(0x0), "Zero Address check");
        assetManager = IAssetManager(newDelegateAddress);
        blockManager = IBlockManager(newResultAddress);
        governance = governanceAddress;
    }

    function setIDName(string calldata name, uint8 _id) external override onlyRole(DELEGATOR_MODIFIER_ROLE) {
        bytes32 _name = keccak256(abi.encodePacked(name));
        require(ids[_name] == 0, "Similar collection exists");
        ids[_name] = _id;
    }

    function getNumActiveAssets() external view override returns (uint256) {
        return assetManager.getNumActiveAssets();
    }

    function getActiveAssets() external view override returns (uint8[] memory) {
        return assetManager.getActiveAssets();
    }

    function getResult(bytes32 _name) external view override returns (uint32, int8) {
        uint8 index = assetManager.getAssetIndex(ids[_name]);
        uint32 epoch = getEpoch(epochLength);
        uint32[] memory medians = blockManager.getBlock(epoch - 1).medians;
        int8 power = assetManager.getCollectionPower(ids[_name]);
        return (medians[index - 1], power);
    }
}
