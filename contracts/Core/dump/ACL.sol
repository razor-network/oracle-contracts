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

    bytes32 public constant JobConfirmerRole = keccak256("JobConfirmer");

    event JobConfirmerAdded(address indexed account);
    event JobConfirmerRemoved(address indexed account);

    constructor() internal {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AccessControl: sender must be an admin to grant");
        _;
    }
    modifier onlyJobConfirmer() {
        require(isJobConfirmer(msg.sender), "AccessControl: sender must be an JobConfirmer to call this function");
        _;
    }
    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isJobConfirmer(address account) public view returns (bool) {
        return hasRole(JobConfirmerRole,account);
    }
    function grantJobConfirmer(address account) public onlyAdmin {
        grantRole(JobConfirmerRole, account);
        emit JobConfirmerAdded(account);
    }
    function revokeJobConfirmer (address account) public onlyAdmin {
        revokeRole(JobConfirmerRole, account);
        emit JobConfirmerRemoved(account);
    }
}
contract BlockConfirmer is AccessControl {

    bytes32 public constant BlockConfirmerRole = keccak256("BlockConfirmer");
    event BlockConfirmerAdded(address indexed account);
    event BlockConfirmerRemoved(address indexed account);

    constructor() internal {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AccessControl: sender must be an admin to grant");
        _;
    }
    modifier onlyblockConfirmer() {
        require(isBlockConfirmer(msg.sender), "AccessControl: sender must be an BlockConfirmer to call this function");
        _;
    }

    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isBlockConfirmer(address account) public view returns (bool) {
        return hasRole(BlockConfirmerRole,account);
    }
    function grantBlockConfirmer(address account) public onlyAdmin {
        grantRole(BlockConfirmerRole, account);
        emit BlockConfirmerAdded(account);
    }
    function revokeBlockConfirmer (address account) public onlyAdmin {
        revokeRole(BlockConfirmerRole, account);
        emit BlockConfirmerRemoved(account);
    }
}
contract StakeModifier is AccessControl {

    bytes32 public constant StakeModifierRole = keccak256("StakeModifier");

    event StakeModifierAdded(address indexed account);
    event StakeModifierRemoved(address indexed account);

    constructor() internal {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AccessControl: sender must be an admin to grant");
        _;
    }
    modifier onlyStakeModifier() {
        require(isStakeModifier(msg.sender), "AccessControl: sender must be an StakeModifier to call this function");
        _;
    }
    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isStakeModifier(address account) public view returns (bool) {
        return hasRole(StakeModifierRole,account);
    }
    function grantStakeModifier(address account) public onlyAdmin {
        grantRole(StakeModifierRole, account);
        emit StakeModifierAdded(account);
    }
    function revokeStakeModifier (address account) public onlyAdmin {
        revokeRole(StakeModifierRole, account);
        emit StakeModifierRemoved(account);
    }
}
contract StakerActivityUpdater is AccessControl {

    bytes32 public constant StakerActivityUpdaterRole = keccak256("StakerActivityUpdater");

    event StakerActivityUpdaterAdded(address indexed account);
    event StakerActivityUpdaterRemoved(address indexed account);

    constructor() internal {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AccessControl: sender must be an admin to grant");
        _;
    }
    modifier onlyStakerActivityUpdater() {
        require(isStakerActivityUpdater(msg.sender), "AccessControl: sender must be an StakerActivityUpdater to call this function");
        _;
    }
    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    function isStakerActivityUpdater(address account) public view returns (bool) {
        return hasRole(StakerActivityUpdaterRole,account);
    }
    function grantStakerActivityUpdater(address account) public onlyAdmin {
        grantRole(StakerActivityUpdaterRole, account);
        emit StakerActivityUpdaterAdded(account);
    }
    function revokeStakerActivityUpdater (address account) public onlyAdmin {
        revokeRole(StakerActivityUpdaterRole, account);
        emit StakerActivityUpdaterRemoved(account);
    }
}