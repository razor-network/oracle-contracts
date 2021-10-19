// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

abstract contract GovernanceACL {
    // slither-reason : this is absract contract, 
    // in their impl contarcts its always intitized before hand in either initlaize or contstructor
    // slither-disable-next-line uninitialized-state-variables
    address public governance;
    modifier onlyGovernance() {
        require(governance == msg.sender, "caller not a governance contract");
        _;
    }
}
