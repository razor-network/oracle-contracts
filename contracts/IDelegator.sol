// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDelegator {
    function updateAddress(
        address newDelegateAddress,
        address newResultAddres,
        address parametersAddress
    ) external;

    function setIDName(string calldata name, uint8 _id) external;

    function getResult(bytes32 _name) external view returns (uint32);

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
        );

    function getCollection(bytes32 _name)
        external
        view
        returns (
            bool active,
            int8 power,
            uint8[] memory jobIDs,
            uint32 aggregationMethod,
            string memory name
        );

    function getNumActiveAssets() external view returns (uint8);

    function getActiveAssets() external view returns (uint8[] memory);
}
