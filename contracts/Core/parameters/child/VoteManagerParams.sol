// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import "../interfaces/IVoteManagerParams.sol";
import "../ACL.sol";
import "../../storage/Constants.sol";

abstract contract VoteManagerParams is ACL, IVoteManagerParams, Constants {
    uint8 public buffer = 5;
    /// @notice maximum number of collections that can be assigned to the staker
    uint16 public toAssign = 3;
    /// @notice minimum amount of stake required to participate
    uint256 public minStake = 20000 * (10**18);

    /// @inheritdoc IVoteManagerParams
    function setMinStake(uint256 _minStake) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        minStake = _minStake;
    }

    /// @inheritdoc IVoteManagerParams
    function setToAssign(uint16 _toAssign) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-disable-next-line events-maths
        toAssign = _toAssign;
    }

    function setBufferLength(uint8 _bufferLength) external override onlyRole(GOVERNANCE_ROLE) {
        // slither-reason: Disabled across all params childs
        // as they are being called by governance contract only
        // and their before setting, we are emitting event
        // slither-disable-next-line events-maths
        buffer = _bufferLength;
    }
}
