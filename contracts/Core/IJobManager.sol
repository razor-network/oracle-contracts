// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;

interface IJobManager {

    function createJob (string calldata url, string calldata selector, bool repeat) external;
    function fulfillJob(uint256 jobId, uint256 value) external;
    function getResult(uint256 id) external view returns(uint256);
    function getJob(uint256 id) external view returns(string memory url, string memory selector, string memory name, bool repeat, uint256 result);
}
