// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IVoteManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IBlockManager.sol";
import "./storage/VoteStorage.sol";
import "./parameters/child/VoteManagerParams.sol";
import "./StateManager.sol";
import "../Initializable.sol";

contract VoteManager is Initializable, VoteStorage, StateManager, VoteManagerParams, IVoteManager {
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IBlockManager public blockManager;

    event Committed(uint32 epoch, uint32 stakerId, bytes32 commitment, uint256 timestamp);
    event Revealed(uint32 epoch, uint32 stakerId, uint48[] values, uint256 timestamp);

    function initialize(
        address stakeManagerAddress,
        address rewardManagerAddress,
        address blockManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        blockManager = IBlockManager(blockManagerAddress);
    }

    function commit(uint32 epoch, bytes32 commitment) external initialized checkEpochAndState(State.Commit, epoch, epochLength) {
        require(commitment != 0x0, "Invalid commitment");
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(!stakeManager.getStaker(stakerId).isSlashed, "VM : staker is slashed");
        require(stakerId > 0, "Staker does not exist");
        require(commitments[stakerId].epoch != epoch, "already commited");

        // slither-disable-next-line reentrancy-events,reentrancy-no-eth
        if (!blockManager.isBlockConfirmed(epoch - 1)) {
            blockManager.confirmPreviousEpochBlock(stakerId);
        }
        // slither-disable-next-line reentrancy-events,reentrancy-no-eth
        rewardManager.givePenalties(epoch, stakerId);
        // Switch to call confirm block only when block in previous epoch has not been confirmed
        // and if previous epoch do have proposed blocks
        uint256 thisStakerStake = stakeManager.getStake(stakerId);
        if (thisStakerStake >= minStake) {
            commitments[stakerId].epoch = epoch;
            commitments[stakerId].commitmentHash = commitment;
            emit Committed(epoch, stakerId, commitment, block.timestamp);
        }
    }

    function reveal(
        uint32 epoch,
        uint48[] calldata values,
        bytes32 secret
    ) external initialized checkEpochAndState(State.Reveal, epoch, epochLength) {
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        uint256 stakerStake = stakeManager.getStake(stakerId);
        require(stakerId > 0, "Staker does not exist");
        require(commitments[stakerId].epoch == epoch, "not committed in this epoch");
        require(stakerStake >= minStake, "stake below minimum");
        // avoid innocent staker getting slashed due to empty secret
        require(secret != 0x0, "secret cannot be empty");

        //below line also avoid double reveal attack since once revealed, commitment has will be set to 0x0
        require(keccak256(abi.encodePacked(epoch, values, secret)) == commitments[stakerId].commitmentHash, "incorrect secret/value");
        //below require was changed from 0 to minstake because someone with very low stake can manipulate randao

        //TODO: REQUIRE all assets to be revealed
        commitments[stakerId].commitmentHash = 0x0;
        votes[stakerId].epoch = epoch;
        votes[stakerId].values = values;
        uint256 influence = stakeManager.getInfluence(stakerId);
        totalInfluenceRevealed[epoch] = totalInfluenceRevealed[epoch] + influence;
        influenceSnapshot[epoch][stakerId] = influence;
        stakeSnapshot[epoch][stakerId] = stakerStake;
        secrets = keccak256(abi.encodePacked(secrets, secret));

        emit Revealed(epoch, stakerId, values, block.timestamp);
    }

    //bounty hunter revealing secret in commit state
    function snitch(
        uint32 epoch,
        uint48[] calldata values,
        bytes32 secret,
        address stakerAddress
    ) external initialized checkEpochAndState(State.Commit, epoch, epochLength) returns (uint32) {
        require(msg.sender != stakerAddress, "cant snitch on yourself");
        uint32 thisStakerId = stakeManager.getStakerId(stakerAddress);
        require(thisStakerId > 0, "Staker does not exist");
        require(commitments[thisStakerId].epoch == epoch, "not committed in this epoch");
        // avoid innocent staker getting slashed due to empty secret
        require(secret != 0x0, "secret cannot be empty");
        require(keccak256(abi.encodePacked(epoch, values, secret)) == commitments[thisStakerId].commitmentHash, "incorrect secret/value");
        //below line also avoid double reveal attack since once revealed, commitment has will be set to 0x0
        commitments[thisStakerId].commitmentHash = 0x0;
        return stakeManager.slash(epoch, thisStakerId, msg.sender);
    }

    function getCommitment(uint32 stakerId) external view returns (Structs.Commitment memory commitment) {
        //epoch -> stakerid -> commitment
        return (commitments[stakerId]);
    }

    function getVote(uint32 stakerId) external view override returns (Structs.Vote memory vote) {
        //stakerid->votes
        return (votes[stakerId]);
    }

    function getVoteValue(uint16 assetIndex, uint32 stakerId) external view override returns (uint48) {
        //stakerid -> assetid -> vote
        return (votes[stakerId].values[assetIndex]);
    }

    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view override returns (uint256) {
        //epoch -> stakerId
        return (influenceSnapshot[epoch][stakerId]);
    }

    function getStakeSnapshot(uint32 epoch, uint32 stakerId) external view override returns (uint256) {
        //epoch -> stakerId
        return (stakeSnapshot[epoch][stakerId]);
    }

    function getTotalInfluenceRevealed(uint32 epoch) external view override returns (uint256) {
        // epoch -> asset -> stakeWeight
        return (totalInfluenceRevealed[epoch]);
    }

    function getEpochLastCommitted(uint32 stakerId) external view override returns (uint32) {
        return commitments[stakerId].epoch;
    }

    function getEpochLastRevealed(uint32 stakerId) external view override returns (uint32) {
        return votes[stakerId].epoch;
    }

    function getRandaoHash() external view override returns (bytes32) {
        return (secrets);
    }
}
