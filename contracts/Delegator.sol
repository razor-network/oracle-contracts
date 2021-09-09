// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./Core/interface/IAssetManager.sol";
import "./Core/interface/IBlockManager.sol";
import "./Core/interface/IParameters.sol";
import "./Core/storage/Constants.sol";
import "./Core/ACL.sol";

contract Delegator is ACL, Constants {
    address public delegate;
    mapping(bytes32 => uint8) public ids;

    IParameters public parameters;
    IAssetManager public assetManager;
    IBlockManager public blockManager;

    function initialize(
        address newDelegateAddress,
        address newResultAddres,
        address parametersAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newDelegateAddress != address(0x0), "Zero Address check");
        require(newResultAddres != address(0x0), "Zero Address check");
        require(parametersAddress != address(0x0), "Zero Address check");
        delegate = newDelegateAddress;
        assetManager = IAssetManager(newDelegateAddress);
        blockManager = IBlockManager(newResultAddres);
        parameters = IParameters(parametersAddress);
    }

    function setIDName(string calldata name, uint8 _id) external onlyRole(DELEGATOR_MODIFIER_ROLE) {
        bytes32 _name = keccak256(abi.encodePacked(name));
        ids[_name] = _id;
    }

    function getJob(bytes32 _name)
        external
        view
        returns (
            bool active,
            uint8 selectorType,
            int8 power,
            string memory name,
            string memory selector,
            string memory url
        )
    {
        return assetManager.getJob(ids[_name]);
    }

    function getCollection(bytes32 _name)
        external
        view
        returns (
            bool active,
            int8 power,
            uint8[] memory jobIDs,
            uint32 aggregationMethod,
            string memory name
        )
    {
        return assetManager.getCollection(ids[_name]);
    }

    function getNumActiveAssets() external view returns (uint8) {
        return assetManager.getNumActiveAssets();
    }

    function getResult(bytes32 _name) public view returns (uint32) {
        uint8 index = assetManager.getAssetIndex(ids[_name]);
        uint32 epoch = parameters.getEpoch();
        uint32[] memory medians = blockManager.getBlockMedians(epoch - 1);
        return medians[index - 1];
    }
}
