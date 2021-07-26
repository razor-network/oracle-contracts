// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";


contract ACL is AccessControl {
    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}
