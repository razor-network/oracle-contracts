// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IVoteManagerParams.sol";
import "./utils/GovernanceACL.sol";

abstract contract VoteManagerParams is GovernanceACL, IVoteManagerParams {
    uint256 public minStake = 1000 * (10**18);
    uint16 public epochLength = 300;

    function setEpochLength(uint16 _epochLength) external override onlyGovernance {
        // slither-disable-next-line events-maths
        epochLength = _epochLength;
    }

    function setMinStake(uint256 _minStake) external override onlyGovernance {
        // slither-disable-next-line events-maths
        minStake = _minStake;
    }
}
