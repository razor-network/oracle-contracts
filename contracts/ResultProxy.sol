pragma solidity 0.6.11;
import "./Core/WriterRole.sol";

contract ResultProxy is WriterRole {
    address public jobManagerAddress;

    function changeJobManagerAddress(address _jobManagerAddress) external onlyWriter {
        jobManagerAddress = _jobManagerAddress;
    }


}
