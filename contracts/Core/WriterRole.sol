pragma solidity 0.6.11;


import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract WriterRole is AccessControl {
    
    bytes32 private constant MY_ROLE = keccak256("WRITER");
    bytes32 private constant ADMIN = keccak256("ADMIN");
    
    event WriterAdded(address indexed account);
    event WriterRemoved(address indexed account);
    
    constructor () internal {
        _setRoleAdmin(MY_ROLE,ADMIN);
        _setupRole(ADMIN, msg.sender);
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
        return hasRole(ADMIN,account);
    }

    function isWriter(address account) public view returns (bool) {
        return hasRole(MY_ROLE,account);
    }
    
    function addWriter(address account) public onlyAdmin {
        _addWriter(account);
    }

    function renounceWriter() public onlyWriter {
        _removeWriter(msg.sender);
    }
    
    function _addWriter(address account) internal {
        grantRole(MY_ROLE, account);
        emit WriterAdded(account);
    }
    
    function _removeWriter(address account) internal {
        renounceRole(MY_ROLE, account);
        emit WriterRemoved(account);
    }
}