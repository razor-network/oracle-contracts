// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IBlockManager.sol";
import "./storage/VoteStorage.sol";
import "./StateManager.sol";
import "../Initializable.sol";
import "./ACL.sol";

contract VoteManager is Initializable, ACL, VoteStorage, StateManager {
    IParameters public parameters;
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IBlockManager public blockManager;

    event Committed(uint32 epoch, uint32 stakerId, bytes32 commitment, uint256 timestamp);
    event Revealed(uint32 epoch, uint32 stakerId, uint32[] values, uint256 timestamp);

    function initialize(
        address stakeManagerAddress,
        address rewardManagerAddress,
        address blockManagerAddress,
        address parametersAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        blockManager = IBlockManager(blockManagerAddress);
        parameters = IParameters(parametersAddress);
    }

    function commit(uint32 epoch, bytes32 commitment)
        external
        initialized
        checkEpochAndState(epoch, parameters.epochLength(), State.Commit)
    {
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(commitments[stakerId].epoch != epoch, "already commited");

        // Switch to call confirm block only when block in previous epoch has not been confirmed
        // and if previous epoch do have proposed blocks

        if (blockManager.getBlock(epoch - 1).proposerId == 0) {
            blockManager.confirmBlock(epoch);
        }
        rewardManager.givePenalties(stakerId, epoch);

        uint256 thisStakerStake = stakeManager.getStake(stakerId);
        if (thisStakerStake >= parameters.minStake()) {
            commitments[stakerId].epoch = epoch;
            commitments[stakerId].commitmentHash = commitment;
            emit Committed(epoch, stakerId, commitment, block.timestamp);
        }
    }

    function reveal(
        uint32 epoch,
        uint32[] calldata values,
        bytes32 secret,
        address stakerAddress
    ) external initialized checkEpoch(epoch, parameters.epochLength()) {
        uint32 thisStakerId = stakeManager.getStakerId(stakerAddress);
        require(thisStakerId > 0, "Staker does not exist");
        require(commitments[thisStakerId].epoch == epoch, "not committed in this epoch");
        // avoid innocent staker getting slashed due to empty secret
        require(secret != 0x0, "secret cannot be empty");

        //below line also avoid double reveal attack since once revealed, commitment has will be set to 0x0
        require(keccak256(abi.encodePacked(epoch, values, secret)) == commitments[thisStakerId].commitmentHash, "incorrect secret/value");
        commitments[thisStakerId].commitmentHash = 0x0;
        //bounty hunter
        if (msg.sender != stakerAddress) {
            require(getState(parameters.epochLength()) == State.Commit, "Not commit state");
            stakeManager.slash(thisStakerId, msg.sender, epoch);
            return;
        }
        //revealing self
        require(getState(parameters.epochLength()) == State.Reveal, "Not reveal state");
        //below require was changed from 0 to minstake because someone with very low stake can manipulate randao
        require(stakeManager.getStake(thisStakerId) > parameters.minStake(), "stake below minimum");

        votes[thisStakerId].epoch = epoch;
        votes[thisStakerId].values = values;
        uint256 influence = stakeManager.getInfluence(thisStakerId);
        totalInfluenceRevealed[epoch] = totalInfluenceRevealed[epoch] + influence;
        influenceSnapshot[epoch][thisStakerId] = influence;
        secrets = keccak256(abi.encodePacked(secrets, secret));

        emit Revealed(epoch, thisStakerId, values, block.timestamp);
    }

    function getCommitment(uint32 stakerId) external view returns (Structs.Commitment memory commitment) {
        //epoch -> stakerid -> commitment
        return (commitments[stakerId]);
    }

    function getVote(uint32 stakerId) external view returns (Structs.Vote memory vote) {
        //stakerid -> assetid -> vote
        return (votes[stakerId]);
    }

    function getVoteValue(uint32 stakerId, uint8 assetId) external view returns (uint32) {
        //stakerid -> assetid -> vote
        return (votes[stakerId].values[assetId]);
    }

    function getInfluenceSnapshot(uint32 epoch, uint32 stakerId) external view returns (uint256) {
        //epoch -> assetid -> voteValue -> weight
        return (influenceSnapshot[epoch][stakerId]);
    }

    function getTotalInfluenceRevealed(uint32 epoch) external view returns (uint256) {
        // epoch -> asset -> stakeWeight
        return (totalInfluenceRevealed[epoch]);
    }

    function getEpochLastCommitted(uint32 stakerId) external view returns (uint32) {
        return commitments[stakerId].epoch;
    }

    function getEpochLastRevealed(uint32 stakerId) external view returns (uint32) {
        return votes[stakerId].epoch;
    }

    function getRandaoHash() public view returns (bytes32) {
        return (secrets);
    }
}
