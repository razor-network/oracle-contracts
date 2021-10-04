// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/interface/IAssetManager.sol";
import "./Core/interface/IBlockManager.sol";
import "./Core/interface/IParameters.sol";
import "./Core/storage/Constants.sol";
import "./Core/ACL.sol";

contract Delegator is ACL, Constants {
    mapping(bytes32 => uint8) public ids;

    IParameters public parameters;
    IAssetManager public assetManager;
    IBlockManager public blockManager;

    function updateAddress(
        address newDelegateAddress,
        address newResultAddress,
        address parametersAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0), "Zero Address check");
        require(newResultAddress != address(0x0), "Zero Address check");
        require(parametersAddress != address(0x0), "Zero Address check");
        assetManager = IAssetManager(newDelegateAddress);
        blockManager = IBlockManager(newResultAddress);
        parameters = IParameters(parametersAddress);
    }

    function setIDName(string calldata name, uint8 _id) external onlyRole(DELEGATOR_MODIFIER_ROLE) {
        bytes32 _name = keccak256(abi.encodePacked(name));
        require(ids[_name] == 0, "Similar collection exists");
        ids[_name] = _id;
    }

    function getNumActiveAssets() external view returns (uint256) {
        return assetManager.getNumActiveAssets();
    }

    function getActiveAssets() external view returns (uint8[] memory) {
        return assetManager.getActiveAssets();
    }

    function getResult(bytes32 _name) external view returns (uint32, int8) {
        uint8 index = assetManager.getAssetIndex(ids[_name]);
        uint32 epoch = parameters.getEpoch();
        uint32[] memory medians = blockManager.getBlock(epoch - 1).medians;
        int8 power = assetManager.getCollectionPower(ids[_name]);
        return (medians[index - 1], power);
    }
}
