// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./interface/IBlockManager.sol";
import "./interface/IStakeManager.sol";
import "./interface/IRewardManager.sol";
import "./interface/IVoteManager.sol";
import "./interface/ICollectionManager.sol";
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
    ICollectionManager public collectionManager;
    IRandomNoProvider public randomNoProvider;

    event BlockConfirmed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 timestamp);

    event Proposed(uint32 epoch, uint32 stakerId, uint32[] medians, uint256 iteration, uint32 biggestStakerId, uint256 timestamp);

    function initialize(
        address stakeManagerAddress,
        address rewardManagerAddress,
        address voteManagerAddress,
        address collectionManagerAddress,
        address randomNoManagerAddress
    ) external initializer onlyRole(DEFAULT_ADMIN_ROLE) {
        stakeManager = IStakeManager(stakeManagerAddress);
        rewardManager = IRewardManager(rewardManagerAddress);
        voteManager = IVoteManager(voteManagerAddress);
        collectionManager = ICollectionManager(collectionManagerAddress);
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

    /// @dev The IDs being passed here, are only used for disputeForNonAssignedCollection
    /// for delegator, we have seprate registry
    /// If user passes invalid ids, disputeForProposedCollectionIds can happen

    function propose(
        uint32 epoch,
        uint16[] memory ids,
        uint32[] memory medians,
        uint256 iteration,
        uint32 biggestStakerId
    ) external initialized checkEpochAndState(State.Propose, epoch) {
        uint32 proposerId = stakeManager.getStakerId(msg.sender);
        require(_isElectedProposer(iteration, biggestStakerId, proposerId, epoch), "not elected");
        require(stakeManager.getStake(proposerId) >= minStake, "stake below minimum stake");
        //staker can just skip commit/reveal and only propose every epoch to avoid penalty.
        //following line is to prevent that
        require(voteManager.getEpochLastRevealed(proposerId) == epoch, "Cannot propose without revealing");
        require(epochLastProposed[proposerId] != epoch, "Already proposed");
        require(medians.length == collectionManager.getNumActiveCollections(), "invalid block proposed");

        uint256 biggestStake = voteManager.getStakeSnapshot(epoch, biggestStakerId);
        if (sortedProposedBlockIds[epoch].length == 0) numProposedBlocks = 0;
        proposedBlocks[epoch][numProposedBlocks] = Structs.Block(true, proposerId, medians, ids, iteration, biggestStake);
        bool isAdded = _insertAppropriately(epoch, numProposedBlocks, iteration, biggestStake);
        epochLastProposed[proposerId] = epoch;
        if (isAdded) {
            numProposedBlocks = numProposedBlocks + 1;
        }
        emit Proposed(epoch, proposerId, medians, iteration, biggestStakerId, block.timestamp);
    }

    //anyone can give sorted votes in batches in dispute state
    function giveSorted(
        uint32 epoch,
        uint16 medianIndex,
        uint32[] memory sortedValues
    ) external initialized checkEpochAndState(State.Dispute, epoch) {
        require(medianIndex <= (collectionManager.getNumActiveCollections() - 1), "Invalid MedianIndex value");
        uint256 accWeight = disputes[epoch][msg.sender].accWeight;
        uint256 accProd = disputes[epoch][msg.sender].accProd;
        uint32 lastVisitedValue = disputes[epoch][msg.sender].lastVisitedValue;

        if (disputes[epoch][msg.sender].accWeight == 0) {
            disputes[epoch][msg.sender].medianIndex = medianIndex;
        } else {
            require(disputes[epoch][msg.sender].medianIndex == medianIndex, "MedianIndex not matching");
            // require(disputes[epoch][msg.sender].median == 0, "median already found");
        }
        for (uint32 i = 0; i < sortedValues.length; i++) {
            require(sortedValues[i] > lastVisitedValue, "sortedValue <= LVV "); // LVS : Last Visited Value
            lastVisitedValue = sortedValues[i];

            // slither-disable-next-line calls-inside-a-loop
            // reason to ignore : has to be done, as each vote will have diff weight
            uint256 weight = voteManager.getVoteWeight(epoch, medianIndex, sortedValues[i]);
            accProd = accProd + sortedValues[i] * weight;
            accWeight = accWeight + weight;
        }
        disputes[epoch][msg.sender].lastVisitedValue = lastVisitedValue;
        disputes[epoch][msg.sender].accWeight = accWeight;
        disputes[epoch][msg.sender].accProd = accProd;
    }

    // //if any mistake made during giveSorted, resetDispute and start again
    function resetDispute(uint32 epoch) external initialized checkEpochAndState(State.Dispute, epoch) {
        disputes[epoch][msg.sender] = Structs.Dispute(0, 0, 0, 0);
    }

    //O(1)
    function claimBlockReward() external initialized checkState(State.Confirm) {
        uint32 epoch = _getEpoch();
        uint32 stakerId = stakeManager.getStakerId(msg.sender);
        require(stakerId > 0, "Structs.Staker does not exist");
        require(blocks[epoch].proposerId == 0, "Block already confirmed");

        if (sortedProposedBlockIds[epoch].length != 0 && blockIndexToBeConfirmed != -1) {
            uint32 proposerId = proposedBlocks[epoch][sortedProposedBlockIds[epoch][uint8(blockIndexToBeConfirmed)]].proposerId;
            require(proposerId == stakerId, "Block Proposer mismatches");
            _confirmBlock(epoch, proposerId);
        }
        uint32 updateRegistryEpoch = collectionManager.getUpdateRegistryEpoch();
        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch) {
            collectionManager.updateRegistry();
        }
    }

    function confirmPreviousEpochBlock(uint32 stakerId) external override initialized onlyRole(BLOCK_CONFIRMER_ROLE) {
        uint32 epoch = _getEpoch();

        if (sortedProposedBlockIds[epoch - 1].length != 0 && blockIndexToBeConfirmed != -1) {
            _confirmBlock(epoch - 1, stakerId);
        }

        uint32 updateRegistryEpoch = collectionManager.getUpdateRegistryEpoch();
        // slither-disable-next-line incorrect-equality
        if (updateRegistryEpoch <= epoch - 1) {
            collectionManager.updateRegistry();
        }
    }

    function disputeBiggestStakeProposed(
        uint32 epoch,
        uint8 blockIndex,
        uint32 correctBiggestStakerId
    ) external initialized checkEpochAndState(State.Dispute, epoch) returns (uint32) {
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        uint256 correctBiggestStake = voteManager.getStakeSnapshot(epoch, correctBiggestStakerId);
        require(correctBiggestStake > proposedBlocks[epoch][blockId].biggestStake, "Invalid dispute : Stake");
        return _executeDispute(epoch, blockIndex, blockId);
    }

    // Epoch X
    // 0,1,2,3
    // 1,2,3,4
    // Deactivate 3

    // Epoch X+1
    // 0,1,2
    // 1,2,4

    // Only 1,2 revealed by stakers, in this epoch,
    // so for 4 value should be used from previous
    // Follwoing function allows dispute for so
    function disputeForNonAssignedCollection(
        uint32 epoch,
        uint8 blockIndex,
        uint16 medianIndex
    ) external initialized checkEpochAndState(State.Dispute, epoch) returns (uint32) {
        require(medianIndex <= (collectionManager.getNumActiveCollections() - 1), "Invalid MedianIndex value");
        require(voteManager.getTotalInfluenceRevealed(epoch, medianIndex) == 0, "Collec is revealed this epoch");

        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];

        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");

        uint16 currentId = proposedBlocks[epoch][blockId].ids[medianIndex];
        uint16 oldIndex = collectionManager.getIdToIndexRegistryValue(currentId);
        require(
            proposedBlocks[epoch][blockId].medians[medianIndex] != blocks[epoch - 1].medians[oldIndex],
            "Block proposed with corr medians"
        );
        return _executeDispute(epoch, blockIndex, blockId);
    }

    // Epoch X
    // 0,1,2,3
    // 1,2,3,4
    // Deactivate 3

    // Epoch X+1
    // 0,1,2
    // 1,2,4

    // Propose
    // [1,2,4]
    // [100,200,400]
    // In Dispute I pass 2nd Index

    // Here thing is there is nothing stopping me from passing any deactivated asset also in place of 4
    // 1,2,3
    // 100,200,300
    // This will pass in disputeForNonAssignedCollection(), as indeed value is 300 for id 3 in last epoch
    // Or even repeating same thing
    // For ex. consider case when there are lot of assets
    // 1,2,4,4,4,4,4
    // 100,200,400,400,400.....
    // so as its dependant on user input, it can exploited
    // to solve so, will need to have follwoing dispute

    function disputeForProposedCollectionIds(uint32 epoch, uint8 blockIndex)
        external
        initialized
        checkEpochAndState(State.Dispute, epoch)
        returns (uint32)
    {
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];

        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");

        bytes32 proposedHash = keccak256(abi.encodePacked(proposedBlocks[epoch][blockId].ids));
        bytes32 actualHash = collectionManager.getActiveCollectionsHash();

        require(proposedHash != actualHash, "Block proposed with corr ids");
        return _executeDispute(epoch, blockIndex, blockId);
    }

    // Complexity O(1)
    function finalizeDispute(uint32 epoch, uint8 blockIndex)
        external
        initialized
        checkEpochAndState(State.Dispute, epoch)
        returns (uint32)
    {
        require(
            disputes[epoch][msg.sender].accWeight == voteManager.getTotalInfluenceRevealed(epoch, disputes[epoch][msg.sender].medianIndex),
            "TIR is wrong"
        ); // TIR : total influence revealed
        require(disputes[epoch][msg.sender].accWeight != 0, "Invalid dispute");
        // Would revert if no block is proposed, or the asset specifed was not revealed

        uint32 median = uint32(disputes[epoch][msg.sender].accProd / disputes[epoch][msg.sender].accWeight);
        require(median > 0, "median can not be zero");
        uint32 blockId = sortedProposedBlockIds[epoch][blockIndex];
        require(proposedBlocks[epoch][blockId].valid, "Block already has been disputed");
        uint16 medianIndex = disputes[epoch][msg.sender].medianIndex;
        require(proposedBlocks[epoch][blockId].medians[medianIndex] != median, "Block proposed with same medians");
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

    function _confirmBlock(uint32 epoch, uint32 stakerId) internal {
        uint32 blockId = sortedProposedBlockIds[epoch][uint8(blockIndexToBeConfirmed)];
        blocks[epoch] = proposedBlocks[epoch][blockId];
        bytes32 salt = keccak256(abi.encodePacked(epoch, blocks[epoch].medians)); // not iteration as it can be manipulated

        emit BlockConfirmed(epoch, proposedBlocks[epoch][blockId].proposerId, proposedBlocks[epoch][blockId].medians, block.timestamp);

        voteManager.storeSalt(salt);
        rewardManager.giveBlockReward(stakerId, epoch);
        randomNoProvider.provideSecret(epoch, voteManager.getSalt());
    }

    function _insertAppropriately(
        uint32 epoch,
        uint32 blockId,
        uint256 iteration,
        uint256 biggestStake
    ) internal returns (bool isAdded) {
        uint8 sortedProposedBlockslength = uint8(sortedProposedBlockIds[epoch].length);

        if (sortedProposedBlockslength == 0) {
            sortedProposedBlockIds[epoch].push(0);
            blockIndexToBeConfirmed = 0;
            return true;
        }

        if (proposedBlocks[epoch][sortedProposedBlockIds[epoch][0]].biggestStake > biggestStake) {
            return false;
        }

        if (proposedBlocks[epoch][sortedProposedBlockIds[epoch][0]].biggestStake < biggestStake) {
            for (uint8 i = 0; i < sortedProposedBlockslength; i++) {
                sortedProposedBlockIds[epoch].pop();
            }
            sortedProposedBlockIds[epoch].push(blockId);
            return true;
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

                return true;
            }
        }
        // Worst Iteration and for all other blocks, influence was >=
        if (sortedProposedBlockIds[epoch].length < maxAltBlocks) {
            sortedProposedBlockIds[epoch].push(blockId);
            return true;
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
        uint32 biggestStakerId,
        uint32 stakerId,
        uint32 epoch
    ) internal view initialized returns (bool) {
        // generating pseudo random number (range 0..(totalstake - 1)), add (+1) to the result,
        // since prng returns 0 to max-1 and staker start from 1

        bytes32 salt = voteManager.getSalt();
        bytes32 seed1 = Random.prngHash(salt, keccak256(abi.encode(iteration)));
        uint256 rand1 = Random.prng(stakeManager.getNumStakers(), seed1);
        if ((rand1 + 1) != stakerId) {
            return false;
        }
        bytes32 seed2 = Random.prngHash(salt, keccak256(abi.encode(stakerId, iteration)));
        uint256 rand2 = Random.prng(2**32, seed2);

        uint256 biggestStake = voteManager.getStakeSnapshot(epoch, biggestStakerId);
        uint256 stake = voteManager.getStakeSnapshot(epoch, stakerId);
        if (rand2 * (biggestStake) > stake * (2**32)) return (false);
        return true;
    }
}
