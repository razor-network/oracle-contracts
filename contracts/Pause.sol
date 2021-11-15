// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/security/Pausable.sol";
import "./Core/parameters/ACL.sol";
import "./Core/storage/Constants.sol";

contract Pause is Pausable, ACL, Constants {
    function pause() external onlyRole(PAUSE_ROLE) {
        Pausable._pause();
    }

    function unpause() external onlyRole(PAUSE_ROLE) {
        Pausable._unpause();
    }
}
