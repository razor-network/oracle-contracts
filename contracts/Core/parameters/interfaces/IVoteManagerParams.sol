// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IVoteManagerParams {
    function setEpochLength(uint16 _epochLength) external;

    function setMinStake(uint256 _minStake) external;

    function setNoOfAssetsAlloted(uint16 _noOfAssetsAlloted) external;
}
