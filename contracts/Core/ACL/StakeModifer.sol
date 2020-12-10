pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract StakeActivityUpdater is AccessControl {

    bytes32 public constant StakeActivityUpdater = keccak256("StakeActivityUpdater");
   
    event StakeActivityUpdaterAdded(address indexed account);
    event StakeActivityUpdaterRemoved(address indexed account);
 
    constructor(address [] memory _accounts)public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

       
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminRole: caller does not have the Admin role");
        _;
    }
    modifier onlyStakeActivityUpdater() {
        require(isStakeActivityUpdater(msg.sender), "StakeActivityUpdater: caller does not have the StakeActivityUpdater role");
        _;
    }



    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isStakeActivityUpdater(address account) public view returns (bool) {
        return hasRole(StakeActivityUpdater,account);
    }


    function addStakeActivityUpdater(address account) public onlyAdmin {
            grantRole(StakeActivityUpdater, account);
            emit StakeActivityUpdaterAdded(account);
    }
    function revokeStakeActivityUpdater (address account) public onlyAdmin {
        revokeRole(StakeActivityUpdater, account);
        emit StakeActivityUpdaterRemoved(account);
    }
   
}