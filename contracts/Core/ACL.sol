// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../lib/Constants.sol";


contract ACL is AccessControl {
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyRole(bytes32 _hash) {
        require(hasRole(_hash, msg.sender), "ACL: sender not authorized");
        _;
    }
}