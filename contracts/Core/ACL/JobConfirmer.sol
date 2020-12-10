pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract JobConfirmer is AccessControl {

    bytes32 public constant JobConfirmer = keccak256("JobConfirmer");
   
    event JobConfirmerAdded(address indexed account);
    event JobConfirmerRemoved(address indexed account);
 
    constructor(address [] memory _accounts)public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

       
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminRole: caller does not have the Admin role");
        _;
    }
    modifier onlyJobConfirmer() {
        require(isJobConfirmer(msg.sender), "JobConfirmer: caller does not have the JobConfirmer role");
        _;
    }



    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isJobConfirmer(address account) public view returns (bool) {
        return hasRole(JobConfirmer,account);
    }


    function addJobConfirmer(address account) public onlyAdmin {
            grantRole(JobConfirmer, account);
            emit JobConfirmerAdded(account);
    }
    function revokeJobConfirmer (address account) public onlyAdmin {
        revokeRole(JobConfirmer, account);
        emit JobConfirmerRemoved(account);
    }
   
}