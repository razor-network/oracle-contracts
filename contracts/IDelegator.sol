// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDelegator {
    function updateAddress(address newDelegateAddress) external;

    function getResult(bytes32 _name) external view returns (uint32, int8);

    function getResultFromID(uint16 _id) external view returns (uint32, int8);

    function getNumActiveCollections() external view returns (uint256);
}
