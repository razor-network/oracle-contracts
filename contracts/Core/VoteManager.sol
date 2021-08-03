// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "./interface/IParameters.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IBlockManager.sol";
import "./interface/IAssetManager.sol";
import "./storage/VoteStorage.sol";
import "../Initializable.sol";
import "./ACL.sol";
import "../lib/Random.sol";
import "hardhat/console.sol";

contract VoteManager is Initializable, ACL, VoteStorage {
    IParameters public parameters;
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IBlockManager public blockManager;
    IAssetManager public assetManager;

    event Committed(uint32 epoch, uint256 stakerId, bytes32 commitment, uint256 timestamp);
    event Revealed(uint32 epoch, uint256 stakerId, uint256 stake, Structs.AssignedAsset[] values, uint256 timestamp);

    modifier checkEpoch(uint32 epoch) {
        require(epoch == parameters.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState(uint256 state) {
        require(state == parameters.getState(), "incorrect state");
        _;
    }

    function initialize(
        address stakeManagerAddress,
        address rewardManagerAddress,
        address blockManagerAddress,
        address parametersAddress,
        address assetManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        blockManager = IBlockManager(blockManagerAddress);
        parameters = IParameters(parametersAddress);
        assetManager = IAssetManager(assetManagerAddress);
    }

    function commit(uint32 epoch, bytes32 commitment) external initialized checkEpoch(epoch) checkState(parameters.commit()) {
        uint256 stakerId = stakeManager.getStakerId(msg.sender);
        require(commitments[stakerId].epoch != epoch, "already commited");
        uint256 thisStakerStake = stakeManager.getStake(stakerId);
        require(thisStakerStake >= parameters.minStake());

        // Switch to call confirm block only when block in previous epoch has not been confirmed
        // and if previous epoch do have proposed blocks

        if (blockManager.getBlock(epoch - 1).proposerId == 0 && blockManager.getNumProposedBlocks(epoch - 1) > 0) {
            blockManager.confirmBlock();
        }
        rewardManager.givePenalties(stakerId, epoch);

        commitments[stakerId] = Structs.Commitment({epoch: epoch, commitmentHash: commitment});
        emit Committed(epoch, stakerId, commitment, block.timestamp);
    }

    function reveal(
        uint32 epoch,
        bytes32 root,
        Structs.AssignedAsset[] memory values,
        bytes32[][] memory proofs,
        bytes32 secret,
        address stakerAddress
    ) external initialized checkEpoch(epoch) {
        uint256 thisStakerId = stakeManager.getStakerId(stakerAddress);
        require(thisStakerId > 0, "Structs.Staker does not exist");
        Structs.Staker memory thisStaker = stakeManager.getStaker(thisStakerId);
        require(commitments[thisStakerId].epoch == epoch, "not commited in this epoch");
        require(keccak256(abi.encodePacked(epoch, root, secret)) == commitments[thisStakerId].commitmentHash, "incorrect secret/value");
        require(values.length == parameters.maxAssetsPerStaker(), "Revealed assets not equal to required assets per staker");

        //if revealing self
        if (msg.sender == stakerAddress) {
            require(parameters.getState() == parameters.reveal(), "Not reveal state");
            require(thisStaker.stake > 0, "nonpositive stake");
            for (uint256 i = 0; i < values.length; i++) {
                if ((votes[thisStakerId][values[i].id - 1]).epoch != epoch) {
                    console.log("values[i].id", values[i].id);
                    console.log("thisStakerId", thisStakerId);
                    // If Job Not Revealed before
                    require(isAssetAllotedToStaker(thisStakerId, i, values[i].id), "Revealed asset not alloted");
                    require(MerkleProof.verify(proofs[i], root, keccak256(abi.encodePacked(values[i].value))), "invalid merkle proof");
                    uint256 influence = stakeManager.getInfluence(thisStakerId);
                    votes[thisStakerId][values[i].id - 1] = Structs.Vote(epoch, values[i].value, thisStaker.stake);
                    voteWeights[epoch][values[i].id - 1][values[i].value] =
                        voteWeights[epoch][values[i].id - 1][values[i].value] +
                        influence;
                    totalInfluenceRevealed[epoch][values[i].id - 1] = totalInfluenceRevealed[epoch][values[i].id - 1] + influence;
                }
            }

            commitments[thisStakerId].commitmentHash = 0x0;
            stakeManager.setStakerEpochLastRevealed(thisStakerId, epoch);

            emit Revealed(epoch, thisStakerId, thisStaker.stake, values, block.timestamp);
        } else {
            //bounty hunter revealing someone else's secret in commit state
            require(parameters.getState() == parameters.commit(), "Not commit state");
            commitments[thisStakerId].commitmentHash = 0x0;
            stakeManager.slash(thisStakerId, msg.sender, epoch);
        }
    }

    function isAssetAllotedToStaker(
        uint256 stakerId,
        uint256 iteration,
        uint256 assetId
    ) public view initialized returns (bool) {
        // numBlocks = 10, max= numAssets, seed = iteration+stakerId, epochLength
        if (
            (Random.prng(10, assetManager.getNumAssets(), keccak256(abi.encode(iteration + stakerId)), parameters.epochLength()) + (1)) ==
            assetId
        ) return true;
        return false;
    }

    function getCommitment(uint256 stakerId) external view returns (Structs.Commitment memory commitment) {
        //epoch -> stakerid -> commitment
        return (commitments[stakerId]);
    }

    function getVote(uint256 stakerId, uint256 assetId) external view returns (Structs.Vote memory vote) {
        //epoch -> stakerid -> assetid -> vote
        return (votes[stakerId][assetId]);
    }

    function getVoteWeight(
        uint32 epoch,
        uint256 assetId,
        uint256 voteValue
    ) public view returns (uint256) {
        //epoch -> assetid -> voteValue -> weight
        return (voteWeights[epoch][assetId][voteValue]);
    }

    function getTotalInfluenceRevealed(uint32 epoch, uint256 assetId) external view returns (uint256) {
        // epoch -> asset -> stakeWeight
        return (totalInfluenceRevealed[epoch][assetId]);
    }

    // function resetTotalInfluenceRevealed() public initialized onlyRole(parameters.getVoteModifierHash()) {
    //     // epoch -> asset -> stakeWeight
    //     totalInfluenceRevealed[assetId]);
    // }
}
