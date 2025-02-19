// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IBondManager {
    function occurrenceRecalculation() external;

    function databondCollectionsReset() external;

    function getDatabondCollections() external view returns (uint16[] memory);
}
