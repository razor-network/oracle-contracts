pragma solidity 0.6.11;


import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract WriterRole is AccessControl {
    
    bytes32 private constant WRITER_ROLE = keccak256("WRITER");
    
    event WriterAdded(address indexed account);
    event WriterRemoved(address indexed account);
    
    constructor () internal {
        _setRoleAdmin(WRITER_ROLE,DEFAULT_ADMIN_ROLE);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    modifier onlyWriter() {
        require(isWriter(msg.sender), "WriterRole: caller does not have the Writer role");
        _;
    }

    modifier onlyAdmin() {
        require(isAdmin(msg.sender), "AdminRole: caller does not have the Admin role");
        _;
    }

    function isAdmin(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }

    function isWriter(address account) public view returns (bool) {
        return hasRole(WRITER_ROLE,account);
    }
    
    function addWriter(address account) public onlyAdmin {
        _addWriter(account);
    }

    function renounceWriter(address account) public onlyAdmin {
        _removeWriter(account);
    }
    
    function _addWriter(address account) internal {
        grantRole(WRITER_ROLE, account);
        emit WriterAdded(account);
    }
    
    function _removeWriter(address account) internal {
        revokeRole(WRITER_ROLE, account);
        emit WriterRemoved(account);
    }
}