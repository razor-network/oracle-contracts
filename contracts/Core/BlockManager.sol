// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IBlockManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IVoteManager.sol";
import "./interface/IAssetManager.sol";
import "../randomNumber/IRandomNoProvider.sol";
import "./storage/BlockStorage.sol";
import "./parameters/child/BlockManagerParams.sol";
import "./StateManager.sol";
import "../lib/Random.sol";
import "../Initializable.sol";

contract BlockManager is Initializable, BlockStorage, StateManager, BlockManagerParams, IBlockManager {
    IStakeManager public stakeManager;
    IRewardManager public rewardManager;
    IVoteManager public voteManager;
    IAssetManager public assetManager;
    IRandomNoProvider public randomNoProvider;

    event BlockConfirmed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 timestamp);

    event Proposed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 iteration, uint256 timestamp);

    function initialize(
        address stakeManagerAddress,
        address rewardManagerAddress,
        address voteManagerAddress,
        address assetManagerAddress,
        address randomNoManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        voteManager = IVoteManager(voteManagerAddress);
        assetManager = IAssetManager(assetManagerAddress);
        randomNoProvider = IRandomNoProvider(randomNoManagerAddress);
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
        uint256 iteration
    ) external initialized checkEpochAndState(State.Propose, epoch, epochLength) {
        uint32 proposerId = stakeManager.getStakerId(msg.sender);
        require(_isElectedProposer(iteration, proposerId, epoch), "not elected");
        require(stakeManager.getStake(proposerId) >= minStake, "stake below minimum stake");
        //staker can just skip commit/reveal and only propose every epoch to avoid penalty.
        //following line is to prevent that
        require(voteManager.getEpochLastRevealed(proposerId) == epoch, "Cannot propose without revealing");
        require(epochLastProposed[proposerId] != epoch, "Already proposed");
        require(medians.length == assetManager.getNumActiveCollections(), "invalid block proposed");

        if (sortedProposedBlockIds[epoch].length == 0) numProposedBlocks = 0;
        proposedBlocks[epoch][numProposedBlocks] = Structs.Block(true, proposerId, medians, iteration);
        _insertAppropriately(epoch, numProposedBlocks, iteration);
        epochLastProposed[proposerId] = epoch;
        numProposedBlocks = numProposedBlocks + 1;
        emit Proposed(epoch, proposerId, medians, iteration, block.timestamp);
    }

    //anyone can give sorted votes in batches in dispute state
    function giveSorted(
        uint32 epoch,
        uint16 collectionId,
        uint32[] memory sortedStakers
    ) external initialized checkEpochAndState(State.Dispute, epoch, epochLength) {
        uint256 accWeight = disputes[epoch][msg.sender].accWeight;
        uint256 accProd = disputes[epoch][msg.sender].accProd;
        uint32 lastVisitedStaker = disputes[epoch][msg.sender].lastVisitedStaker;
        uint16 collectionIndex = assetManager.getCollectionIndex(collectionId);
        if (disputes[epoch][msg.sender].accWeight == 0) {
            disputes[epoch][msg.sender].collectionId = collectionId;
        } else {
            require(disputes[epoch][msg.sender].collectionId == collectionId, "AssetId not matching");
            // require(disputes[epoch][msg.sender].median == 0, "median already found");
        }
        for (uint32 i = 0; i < sortedStakers.length; i++) {
            require(sortedStakers[i] > lastVisitedStaker, "sortedStaker <= LVS "); // LVS : Last Visited Staker
            lastVisitedStaker = sortedStakers[i];
            // slither-disable-next-line calls-loop
            Structs.Vote memory vote = voteManager.getVote(lastVisitedStaker);
            require(vote.epoch == epoch, "staker didnt vote in this epoch");

            uint48 value = vote.values[collectionIndex - 1];
            // slither-disable-next-line calls-loop
            uint256 influence = voteManager.getInfluenceSnapshot(epoch, lastVisitedStaker);
            accProd = accProd + value * influence;
            accWeight = accWeight + influence;
        }
        disputes[epoch][msg.sender].lastVisitedStaker = lastVisitedStaker;
        disputes[epoch][msg.sender].accWeight = accWeight;
        disputes[epoch][msg.sender].accProd = accProd;
    }

    // //if any mistake made during giveSorted, resetDispute and start again
    function resetDispute(uint32 epoch) external initialized checkEpochAndState(State.Dispute, epoch, epochLength) {
        disputes[epoch][msg.sender] = Structs.Dispute(0, 0, 0, 0);
    }

    //O(1)
    function claimBlockReward() external initialized checkState(State.Confirm, epochLength) {
        uint32 epoch = _getEpoch(epochLength);
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(stakerId > 0, "Structs.Staker does not exist");
        require(blocks[epoch].proposerId == 0, "Block already confirmed");

        uint16[] memory deactivatedCollections = assetManager.getPendingDeactivations();
        if (sortedProposedBlockIds[epoch].length == 0 || blockIndexToBeConfirmed == -1) {
            assetManager.executePendingDeactivations(epoch);
            return;
        }
        uint32 proposerId = proposedBlocks[epoch][sortedProposedBlockIds[epoch][uint8(blockIndexToBeConfirmed)]].proposerId;
        require(proposerId == stakerId, "Block Proposer mismatches");
        _confirmBlock(epoch, deactivatedCollections, proposerId);
    }

    function confirmPreviousEpochBlock(uint32 stakerId) external override initialized onlyRole(BLOCK_CONFIRMER_ROLE) {
        uint32 epoch = _getEpoch(epochLength);
        uint16[] memory deactivatedCollections = assetManager.getPendingDeactivations();
        if (sortedProposedBlockIds[epoch - 1].length == 0 || blockIndexToBeConfirmed == -1) {
            assetManager.executePendingDeactivations(epoch);
            return;
        }
        _confirmBlock(epoch - 1, deactivatedCollections, stakerId);
    }

    // Complexity O(1)
    function finalizeDispute(uint32 epoch, uint8 blockIndex)
        external
        initialized
        checkEpochAndState(State.Dispute, epoch, epochLength)
        returns (uint32)
    {
        require(disputes[epoch][msg.sender].accWeight == voteManager.getTotalInfluenceRevealed(epoch), "TIR is wrong"); // TIR : total influence revealed
        uint32 median = uint32(disputes[epoch][msg.sender].accProd / disputes[epoch][msg.sender].accWeight);
        require(median > 0, "median can not be zero");
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        uint16 collectionId = disputes[epoch][msg.sender].collectionId;
        uint16 collectionIndex = assetManager.getCollectionIndex(collectionId);
        require(proposedBlocks[epoch][blockId].medians[collectionIndex - 1] != median, "Block proposed with same medians");
        return _executeDispute(epoch, blockIndex, blockId);
    }

    function getBlock(uint32 epoch) external view override returns (Structs.Block memory _block) {
        return (blocks[epoch]);
    }

    function getProposedBlock(uint32 epoch, uint32 proposedBlock) external view returns (Structs.Block memory _block) {
        _block = proposedBlocks[epoch][proposedBlock];
        return (_block);
    }

    function getNumProposedBlocks(uint32 epoch) external view returns (uint8) {
        return (uint8(sortedProposedBlockIds[epoch].length));
    }

    function isBlockConfirmed(uint32 epoch) external view override returns (bool) {
        return (blocks[epoch].proposerId != 0);
    }

    function _confirmBlock(
        uint32 epoch,
        uint16[] memory deactivatedCollections,
        uint32 stakerId
    ) internal {
        uint32 blockId = sortedProposedBlockIds[epoch][uint8(blockIndexToBeConfirmed)];
        for (uint16 i = uint16(deactivatedCollections.length); i > 0; i--) {
            // slither-disable-next-line calls-loop
            uint16 index = assetManager.getCollectionIndex(deactivatedCollections[i - 1]);
            if (index == proposedBlocks[epoch][blockId].medians.length) {
                proposedBlocks[epoch][blockId].medians.pop();
            } else {
                proposedBlocks[epoch][blockId].medians[index - 1] = proposedBlocks[epoch][blockId].medians[
                    proposedBlocks[epoch][blockId].medians.length - 1
                ];
                proposedBlocks[epoch][blockId].medians.pop();
            }
        }
        blocks[epoch] = proposedBlocks[epoch][blockId];
        emit BlockConfirmed(epoch, proposedBlocks[epoch][blockId].proposerId, proposedBlocks[epoch][blockId].medians, block.timestamp);
        assetManager.executePendingDeactivations(epoch);
        rewardManager.giveBlockReward(stakerId, epoch);
        randomNoProvider.provideSecret(epoch, voteManager.getRandaoHash());
    }

    function _insertAppropriately(
        uint32 epoch,
        uint32 blockId,
        uint256 iteration
    ) internal {
        uint8 sortedProposedBlockslength = uint8(sortedProposedBlockIds[epoch].length);

        if (sortedProposedBlockslength == 0) {
            sortedProposedBlockIds[epoch].push(0);
            blockIndexToBeConfirmed = 0;
            return;
        }

        for (uint8 i = 0; i < sortedProposedBlockslength; i++) {
            // Push and Shift
            if (proposedBlocks[epoch][sortedProposedBlockIds[epoch][i]].iteration > iteration) {
                sortedProposedBlockIds[epoch].push(blockId);

                sortedProposedBlockslength = sortedProposedBlockslength + 1;

                for (uint256 j = sortedProposedBlockslength - 1; j > i; j--) {
                    sortedProposedBlockIds[epoch][j] = sortedProposedBlockIds[epoch][j - 1];
                }

                sortedProposedBlockIds[epoch][i] = blockId;

                if (sortedProposedBlockIds[epoch].length > maxAltBlocks) {
                    sortedProposedBlockIds[epoch].pop();
                }

                return;
            }
        }
        // Worst Iteration and for all other blocks, influence was >=
        if (sortedProposedBlockIds[epoch].length < maxAltBlocks) {
            sortedProposedBlockIds[epoch].push(blockId);
        }
    }

    function _executeDispute(
        uint32 epoch,
        uint8 blockIndex,
        uint32 blockId
    ) internal returns (uint32) {
        proposedBlocks[epoch][blockId].valid = false;

        uint8 sortedProposedBlocksLength = uint8(sortedProposedBlockIds[epoch].length);
        if (uint8(blockIndexToBeConfirmed) == blockIndex) {
            // If the chosen one only is the culprit one, find successor
            // O(maxAltBlocks)

            blockIndexToBeConfirmed = -1;
            for (uint8 i = blockIndex + 1; i < sortedProposedBlocksLength; i++) {
                uint32 _blockId = sortedProposedBlockIds[epoch][i];
                if (proposedBlocks[epoch][_blockId].valid) {
                    // slither-disable-next-line costly-loop
                    blockIndexToBeConfirmed = int8(i);
                    break;
                }
            }
        }

        uint32 proposerId = proposedBlocks[epoch][blockId].proposerId;
        return stakeManager.slash(epoch, proposerId, msg.sender);
    }

    function _isElectedProposer(
        uint256 iteration,
        uint32 stakerId,
        uint32 epoch
    ) internal view initialized returns (bool) {
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

        uint256 biggestInfluence = voteManager.getBiggestInfluence(epoch);
        uint256 influence = voteManager.getInfluenceSnapshot(epoch, stakerId);
        if (rand2 * (biggestInfluence) > influence * (2**32)) return (false);
        return true;
    }
}
