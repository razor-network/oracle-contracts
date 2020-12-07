pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract WriterRole is AccessControl {

    bytes32 public constant JOB_MANAGER_ROLE = keccak256("JOB_MANAGER_ROLE");
    bytes32 public constant BLOCK_MANAGER_ROLE = keccak256("BLOCK_MANAGER_ROLE");
    bytes32 public constant VOTE_MANAGER_ROLE = keccak256("VOTE_MANAGER_ROLE");
    bytes32 public constant STAKE_MANAGER_ROLE = keccak256("STAKE_MANAGER_ROLE");
 
     constructor(address [] memory _accounts)public {
        // Grant the contract deployer the default admin role: it will be able
        // to grant and revoke any roles
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
         grantRole(JOB_MANAGER_ROLE, _accounts[0]);
         grantRole(BLOCK_MANAGER_ROLE, _accounts[1]);
         grantRole(VOTE_MANAGER_ROLE, _accounts[2]);
         grantRole(STAKE_MANAGER_ROLE, _accounts[3]);
    }
    
    function transferJobManagerRole(address _account) public {
        revokeRole(JOB_MANAGER_ROLE, getRoleMember(JOB_MANAGER_ROLE, 0));
        grantRole(JOB_MANAGER_ROLE, _account);
    }
    
    function transferBlockManagerRole(address _account) public {
        revokeRole(JOB_MANAGER_ROLE, getRoleMember(JOB_MANAGER_ROLE, 0));
        grantRole(JOB_MANAGER_ROLE, _account);
    }
    function transferVoteManagerRole(address _account) public {
        revokeRole(JOB_MANAGER_ROLE, getRoleMember(JOB_MANAGER_ROLE, 0));
        grantRole(JOB_MANAGER_ROLE, _account);
    }
    function transferStakeManagerRole(address _account) public {
        revokeRole(JOB_MANAGER_ROLE, getRoleMember(JOB_MANAGER_ROLE, 0));
        grantRole(JOB_MANAGER_ROLE, _account);
    }
   
    function isJobManager(address _account) public view returns (bool){
        return hasRole(JOB_MANAGER_ROLE, _account);
    }
    function isBlockManager(address _account) public view returns (bool){
        return hasRole(BLOCK_MANAGER_ROLE, _account);
    }
      function isVoteManager(address _account) public view returns (bool){
        return hasRole(VOTE_MANAGER_ROLE, _account);
    }
      function isStakeManager(address _account) public view returns (bool){
        return hasRole(STAKE_MANAGER_ROLE, _account);
    }
}