pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";
import "../lib/Constants.sol";

contract ACL is AccessControl {
    constructor() public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    modifier onlyRole(bytes32 _hash) {
        require(hasRole(_hash,msg.sender), "AccessControl: sender doesnt have appropriate role");
        _;
    }
}
