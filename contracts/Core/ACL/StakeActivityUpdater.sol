pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract StakeModifier is AccessControl {

    bytes32 public constant StakeModifier = keccak256("StakeModifier");
   
    event StakeModifierAdded(address indexed account);
    event StakeModifierRemoved(address indexed account);
 
    constructor(address [] memory _accounts)public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

       
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminRole: caller does not have the Admin role");
        _;
    }
    modifier onlyStakeModifier() {
        require(isStakeModifier(msg.sender), "StakeModifier: caller does not have the StakeModifier role");
        _;
    }



    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isStakeModifier(address account) public view returns (bool) {
        return hasRole(StakeModifier,account);
    }


    function addStakeModifier(address account) public onlyAdmin {
            grantRole(StakeModifier, account);
            emit StakeModifierAdded(account);
    }
    function revokeStakeModifier (address account) public onlyAdmin {
        revokeRole(StakeModifier, account);
        emit StakeModifierRemoved(account);
    }
   
}