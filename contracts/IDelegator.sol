// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface IDelegator {
    function upgradeDelegate(address newDelegateAddress) external;

    function getResult(uint8 id) external view returns (uint32);

    function getJob(uint8 id)
        external
        view
        returns (
            string memory url,
            string memory selector,
            string memory name,
            bool repeat,
            uint32 result
        );
}
