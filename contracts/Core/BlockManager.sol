// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IParameters.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IVoteManager.sol";
import "./interface/IAssetManager.sol";
import "./storage/BlockStorage.sol";
import "../lib/Random.sol";
import "../Initializable.sol";
import "./ACL.sol";

contract BlockManager is Initializable, ACL, BlockStorage {
    IParameters public parameters;
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IVoteManager public voteManager;
    IAssetManager public assetManager;

    event BlockConfirmed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 timestamp);

    event Proposed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 iteration, uint256 biggestInfluencerId, uint256 timestamp);

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
        address voteManagerAddress,
        address assetManagerAddress,
        address parametersAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        voteManager = IVoteManager(voteManagerAddress);
        assetManager = IAssetManager(assetManagerAddress);
        parameters = IParameters(parametersAddress);
    }

    // elected proposer proposes block.
    //we use a probabilistic method to elect stakers weighted by stake
    // protocol works like this.
    //select a staker pseudorandomly (not weighted by anything)
    // that staker then tosses a biased coin.
    //bias = hisStake/biggestStake. if its heads, he can propose block
    // end of iteration. try next iteration
    // note that only one staker or no stakers selected in each iteration.
    // stakers elected in higher iterations can also propose hoping that
    // stakers with lower iteration do not propose for some reason
    function propose(
        uint32 epoch,
        uint32[] memory medians,
        uint256 iteration,
        uint32 biggestInfluencerId
    ) external initialized checkEpoch(epoch) checkState(parameters.propose()) {
        uint32 proposerId = stakeManager.getStakerId(msg.sender);
        require(isElectedProposer(iteration, biggestInfluencerId, proposerId), "not elected");
        require(stakeManager.getStaker(proposerId).stake >= parameters.minStake(), "stake below minimum stake");

        //staker can just skip commit/reveal and only propose every epoch to avoid penalty.
        //following line is to prevent that
        require(voteManager.getEpochLastRevealed(proposerId) == epoch, "Cannot propose without revealing");

        uint256 biggestInfluence = stakeManager.getInfluence(biggestInfluencerId);
        uint8 numProposedBlocks = uint8(sortedProposedBlockIds[epoch].length);
        proposedBlocks[epoch][numProposedBlocks] = Structs.Block(proposerId, medians, iteration, biggestInfluence, true);

        _insertAppropriately(epoch, numProposedBlocks, iteration, biggestInfluence);

        emit Proposed(epoch, proposerId, medians, iteration, biggestInfluencerId, block.timestamp);
    }

    //anyone can give sorted votes in batches in dispute state
    function giveSorted(
        uint32 epoch,
        uint8 assetId,
        uint32[] memory sorted
    ) external initialized checkEpoch(epoch) checkState(parameters.dispute()) {
        uint256 medianWeight = voteManager.getTotalInfluenceRevealed(epoch) / (2);
        uint256 accWeight = disputes[epoch][msg.sender].accWeight;
        uint256 lastVisited = disputes[epoch][msg.sender].lastVisited;
        if (disputes[epoch][msg.sender].accWeight == 0) {
            disputes[epoch][msg.sender].assetId = assetId;
        } else {
            require(disputes[epoch][msg.sender].assetId == assetId, "AssetId not matching");
            // require(disputes[epoch][msg.sender].median == 0, "median already found");
        }
        for (uint256 i = 0; i < sorted.length; i++) {
            require(sorted[i] > lastVisited, "sorted[i] is not greater than lastVisited");
            lastVisited = sorted[i];
            accWeight = accWeight + (voteManager.getVoteWeights(epoch, assetId, sorted[i]));
            if (disputes[epoch][msg.sender].median == 0 && accWeight > medianWeight) {
                disputes[epoch][msg.sender].median = sorted[i];
                // break;
            }
        }
        disputes[epoch][msg.sender].lastVisited = lastVisited;
        disputes[epoch][msg.sender].accWeight = accWeight;
    }

    // //if any mistake made during giveSorted, resetDispute and start again
    function resetDispute(uint32 epoch) external initialized checkEpoch(epoch) checkState(parameters.dispute()) {
        disputes[epoch][msg.sender] = Structs.Dispute(0, 0, 0, 0);
    }

    function confirmBlock(uint32 epoch) external initialized onlyRole(parameters.getBlockConfirmerHash()) {
        for (uint8 i = 0; i < sortedProposedBlockIds[epoch - 1].length; i++) {
            uint8 blockId = sortedProposedBlockIds[epoch - 1][i];
            if (proposedBlocks[epoch - 1][blockId].valid) {
                blocks[epoch - 1] = proposedBlocks[epoch - 1][blockId];
                uint32 proposerId = proposedBlocks[epoch - 1][blockId].proposerId;

                emit BlockConfirmed(epoch - 1, proposerId, proposedBlocks[epoch - 1][i].medians, block.timestamp);
                rewardManager.giveBlockReward(proposerId, epoch);
                return;
            }
        }
    }

    function getBlock(uint32 epoch) external view returns (Structs.Block memory _block) {
        return (blocks[epoch]);
    }

    function getBlockMedians(uint32 epoch) external view returns (uint32[] memory _blockMedians) {
        _blockMedians = blocks[epoch].medians;
        return (_blockMedians);
    }

    function getProposedBlock(uint32 epoch, uint8 proposedBlock)
        external
        view
        returns (Structs.Block memory _block, uint32[] memory _blockMedians)
    {
        _block = proposedBlocks[epoch][proposedBlock];
        return (_block, _block.medians);
    }

    function getProposedBlockMedians(uint32 epoch, uint8 proposedBlock) external view returns (uint32[] memory _blockMedians) {
        _blockMedians = proposedBlocks[epoch][proposedBlock].medians;
        return (_blockMedians);
    }

    function getNumProposedBlocks(uint32 epoch) external view returns (uint256) {
        return (sortedProposedBlockIds[epoch].length);
    }

    function finalizeDispute(uint32 epoch, uint8 blockId) public initialized checkEpoch(epoch) checkState(parameters.dispute()) {
        uint8 assetId = disputes[epoch][msg.sender].assetId;
        require(
            disputes[epoch][msg.sender].accWeight == voteManager.getTotalInfluenceRevealed(epoch),
            "Total influence revealed doesnt match"
        );
        uint256 median = disputes[epoch][msg.sender].median;
        uint32 proposerId = proposedBlocks[epoch][blockId].proposerId;
        require(median > 0, "median can not be zero");
        if (proposedBlocks[epoch][blockId].medians[assetId] != median) {
            proposedBlocks[epoch][blockId].valid = false;
            stakeManager.slash(proposerId, msg.sender, epoch);
        } else {
            revert("Proposed Alternate block is identical to proposed block");
        }
    }

    function isElectedProposer(
        uint256 iteration,
        uint32 biggestInfluencerId,
        uint32 stakerId
    ) public view initialized returns (bool) {
        // generating pseudo random number (range 0..(totalstake - 1)), add (+1) to the result,
        // since prng returns 0 to max-1 and staker start from 1

        bytes32 randaoHashes = voteManager.getRandaoHash();
        bytes32 seed1 = Random.prngHash(randaoHashes, keccak256(abi.encode(iteration)));
        uint256 rand1 = Random.prng(stakeManager.getNumStakers(), seed1);
        if ((rand1 + 1) != stakerId) {
            return false;
        }
        bytes32 seed2 = Random.prngHash(randaoHashes, keccak256(abi.encode(stakerId, iteration)));
        uint256 rand2 = Random.prng(2**32, seed2);

        uint256 biggestInfluence = stakeManager.getInfluence(biggestInfluencerId);
        uint256 influence = stakeManager.getInfluence(stakerId);
        if (rand2 * (biggestInfluence) > influence * (2**32)) return (false);
        return true;
    }

    function _insertAppropriately(
        uint32 epoch,
        uint8 blockId,
        uint256 iteration,
        uint256 biggestInfluence
    ) internal {
        if (sortedProposedBlockIds[epoch].length == 0) {
            sortedProposedBlockIds[epoch].push(0);
            return;
        }

        uint8 pushAt = uint8(sortedProposedBlockIds[epoch].length);
        for (uint8 i = 0; i < sortedProposedBlockIds[epoch].length; i++) {
            if (proposedBlocks[epoch][i].biggestInfluence < biggestInfluence) {
                pushAt = i;
                break;
            }
            if (proposedBlocks[epoch][i].iteration > iteration) {
                pushAt = i;
                break;
            }
        }

        sortedProposedBlockIds[epoch].push(blockId);
        for (uint256 j = sortedProposedBlockIds[epoch].length - 1; j > (pushAt); j--) {
            sortedProposedBlockIds[epoch][j] = sortedProposedBlockIds[epoch][j - 1];
        }

        sortedProposedBlockIds[epoch][pushAt] = blockId;

        if (sortedProposedBlockIds[epoch].length > parameters.maxAltBlocks()) {
            sortedProposedBlockIds[epoch].pop();
        }
    }
}
