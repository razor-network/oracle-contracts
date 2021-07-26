pragma solidity ^0.8.0;
import "@openzeppelin/contracts/security/Pausable.sol";
import "./Core/ACL.sol";

contract Pause is Pausable, ACL {
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        Pausable._pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        Pausable._unpause();
    }
}
