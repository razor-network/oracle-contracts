// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

abstract contract GovernanceACL {
    address public governance;
    modifier onlyGovernance() {
        require(governance == msg.sender, "caller not a governance contract");
        _;
    }
}
