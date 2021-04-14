// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IStateManager {
    function setEpoch (uint256 epoch) external;

    function setState (uint256 state) external;

    function getEpoch () external view returns(uint256);

    function getState () external view returns(uint256);
}
