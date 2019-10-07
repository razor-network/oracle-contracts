pragma solidity 0.5.10;

import "openzeppelin-solidity/contracts/access/Roles.sol";


contract WriterRole {
    using Roles for Roles.Role;

    event WriterAdded(address indexed account);
    event WriterRemoved(address indexed account);

    Roles.Role private _writers;

    constructor () internal {
        _addWriter(msg.sender);
    }

    modifier onlyWriter() {
        require(isWriter(msg.sender), "WriterRole: caller does not have the Writer role");
        _;
    }

    function isWriter(address account) public view returns (bool) {
        return _writers.has(account);
    }

    function addWriter(address account) public onlyWriter {
        _addWriter(account);
    }

    function renounceWriter() public {
        _removeWriter(msg.sender);
    }

    function _addWriter(address account) internal {
        _writers.add(account);
        emit WriterAdded(account);
    }

    function _removeWriter(address account) internal {
        _writers.remove(account);
        emit WriterRemoved(account);
    }
}
