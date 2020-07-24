pragma solidity 0.6.11;

import "openzeppelin-solidity/contracts/access/AccessControl.sol";


contract WriterRole is AccessControl {
    
    event WriterAdded(address indexed account);
    event WriterRemoved(address indexed account);
    
    constructor () internal {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    modifier onlyWriter() {
        require(isWriter(msg.sender), "WriterRole: caller does not have the Writer role");
        _;
    }

    function isWriter(address account) public view returns (bool) {
        return hasRole(DEFAULT_ADMIN_ROLE,account);
    }
    
    function addWriter(address account) public onlyWriter {
        _addWriter(account);
    }

    function renounceWriter() public {
        _removeWriter(msg.sender);
    }
    
    function _addWriter(address account) internal {
        grantRole(DEFAULT_ADMIN_ROLE, account);
        emit WriterAdded(account);
    }
    
    function _removeWriter(address account) internal {
        renounceRole(DEFAULT_ADMIN_ROLE, account);
        emit WriterRemoved(account);
    }
}
