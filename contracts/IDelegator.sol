// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDelegator {
    function updateAddress(address newDelegateAddress, address newResultAddres) external;

    function setIDName(string calldata name, uint8 _id) external;

    function getResult(bytes32 _name) external view returns (uint32, int8);

    function getNumActiveAssets() external view returns (uint256);

    function getActiveAssets() external view returns (uint8[] memory);
}
