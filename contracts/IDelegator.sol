// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDelegator {
    function updateAddress(address newDelegateAddress, address newResultAddres) external;

    function setIDName(string calldata name, uint16 _id) external;

    function getResult(bytes32 _name) external view returns (uint32, int8);

    function getNumActiveCollections() external view returns (uint256);

    function getActiveCollections() external view returns (uint16[] memory);
}
