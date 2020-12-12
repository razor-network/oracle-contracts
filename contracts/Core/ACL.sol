/*
This ACL Contract is about creating descriptive roles for various functions of our contracts.
We have four roles.


1) JobConfirmer          : fulfillJob()
2) BlockConfirmer        : confirmBlock()
3) StakeModifier         : setStakerStake(), giveBlockReward(), slash(), giveRewards()
4) StakerActivityUpdater  : setStakerEpochLastRevealed(), updateCommitmentEpoch()

On top of it we have Default Admin role, which can grant and revoke above roles.

Please go through this diagram to get better idea on it
https://github.com/........(need to be updated)tree/ACL/acl.png;

.*/

pragma solidity 0.6.11;
import "openzeppelin-solidity/contracts/access/AccessControl.sol";
contract JobConfirmer is AccessControl {

    bytes32 public constant JobConfirmer = keccak256("JobConfirmer");

    event JobConfirmerAdded(address indexed account);
    event JobConfirmerRemoved(address indexed account);

    constructor(address[] memory _accounts)public {
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
contract BlockConfirmer is AccessControl {

    bytes32 public constant BlockConfirmer= keccak256("BlockConfirmer");
    event BlockConfirmerAdded(address indexed account);
    event BlockConfirmerRemoved(address indexed account);

    constructor(address[] memory _accounts)public {
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
contract StakeModifier is AccessControl {

    bytes32 public constant StakeModifier = keccak256("StakeModifier");

    event StakeModifierAdded(address indexed account);
    event StakeModifierRemoved(address indexed account);

    constructor(address[] memory _accounts)public {
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
contract StakerActivityUpdater is AccessControl {

    bytes32 public constant StakerActivityUpdater = keccak256("StakerActivityUpdater");

    event StakerActivityUpdaterAdded(address indexed account);
    event StakerActivityUpdaterRemoved(address indexed account);

    constructor(address[] memory _accounts)public {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminRole: caller does not have the Admin role");
        _;
    }
    modifier onlyStakerActivityUpdater() {
        require(isStakerActivityUpdater(msg.sender), "StakerActivityUpdater: caller does not have the StakerActivityUpdater role");
        _;
    }
    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isStakerActivityUpdater(address account) public view returns (bool) {
        return hasRole(StakerActivityUpdater,account);
    }
    function addStakerActivityUpdater(address account) public onlyAdmin {
        grantRole(StakerActivityUpdater, account);
        emit StakerActivityUpdaterAdded(account);
    }
    function revokeStakerActivityUpdater (address account) public onlyAdmin {
        revokeRole(StakerActivityUpdater, account);
        emit StakerActivityUpdaterRemoved(account);
    }
}