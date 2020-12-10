pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract BlockConfirmer is AccessControl {

    bytes32 public constant BlockConfirmer = keccak256("BlockConfirmer");
   
    event BlockConfirmerAdded(address indexed account);
    event BlockConfirmerRemoved(address indexed account);
 
    constructor(address [] memory _accounts)public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

       
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminRole: caller does not have the Admin role");
        _;
    }
    modifier onlyblockConfirmer() {
        require(isBlockConfirmer(msg.sender), "BlockConfirmer: caller does not have the BlockConfirmer role");
        _;
    }



    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isBlockConfirmer(address account) public view returns (bool) {
        return hasRole(BlockConfirmer,account);
    }


    function addBlockConfirmer(address account) public onlyAdmin {
            grantRole(BlockConfirmer, account);
            emit BlockConfirmerAdded(account);
    }
    function revokeBlockConfirmer (address account) public onlyAdmin {
        revokeRole(BlockConfirmer, account);
        emit BlockConfirmerRemoved(account);
    }
   
}