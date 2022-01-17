// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IVoteManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract VoteManagerParams is ACL, IVoteManagerParams, Constants {
    uint16 public epochLength = 300;
    uint16 public toAssign = 3;
    uint256 public minStake = 1000 * (10**18);
   
    function setEpochLength(uint16 _epochLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        epochLength = _epochLength;
    }

    function setMinStake(uint256 _minStake) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        minStake = _minStake;
    }

    function setToAssign(uint16 _toAssign) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        toAssign = _toAssign;
    }
}
