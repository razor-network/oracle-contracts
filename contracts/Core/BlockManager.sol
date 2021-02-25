pragma solidity 0.6.11;
pragma experimental ABIEncoderV2;
import "../lib/Random.sol";
import "./Utils.sol";
import "./BlockStorage.sol";
import "./IStakeManager.sol";
import "./IStateManager.sol";
import "./IVoteManager.sol";
import "./IJobManager.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./ACL.sol";
import "../lib/Constants.sol";

contract BlockManager is Utils, ACL, BlockStorage {
    using SafeMath for uint256;
    IStakeManager public stakeManager;
    IStateManager public stateManager;
    IVoteManager public voteManager;
    IJobManager public jobManager;

    modifier checkEpoch (uint256 epoch) {
        require(epoch == stateManager.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == stateManager.getState(), "incorrect state");
        _;
    }

    function getBlock(uint256 epoch) external view returns(Structs.Block memory _block) {
        return(blocks[epoch]);
    }

    function getBlockMedians(uint256 epoch) external view returns(uint256[] memory _blockMedians) {
        _blockMedians = blocks[epoch].medians;
        return(_blockMedians);
    }

    function getLowerCutoffs(uint256 epoch) external view returns(uint256[] memory _lowerCutoffs) {
        _lowerCutoffs = blocks[epoch].lowerCutoffs;
        return(_lowerCutoffs);
    }

    function getHigherCutoffs(uint256 epoch) external view returns(uint256[] memory _higherCutoffs) {
        _higherCutoffs = blocks[epoch].higherCutoffs;
        return(_higherCutoffs);
    }

    function getProposedBlock(uint256 epoch, uint256 proposedBlock)
    external view returns(Structs.Block memory _block,
    uint256[] memory _blockMedians,
    uint256[] memory _lowerCutoffs,
    uint256[] memory _higherCutoffs ) {
        _block = proposedBlocks[epoch][proposedBlock];
        return(_block, _block.medians, _block.lowerCutoffs, _block.higherCutoffs);
    }

    function getProposedBlockMedians(uint256 epoch, uint256 proposedBlock)
    external view returns(uint256[] memory _blockMedians) {
        _blockMedians = proposedBlocks[epoch][proposedBlock].medians;
        return(_blockMedians);
    }

    function getNumProposedBlocks(uint256 epoch)
    external view returns(uint256) {
        return(proposedBlocks[epoch].length);
    }

    //disable after init.
    function init(address _stakeManagerAddress, address _stateManagerAddress,
                address _voteManagerAddress, address _jobManagerAddress) public {
        stakeManager = IStakeManager(_stakeManagerAddress);
        stateManager = IStateManager(_stateManagerAddress);
        voteManager = IVoteManager(_voteManagerAddress);
        jobManager = IJobManager(_jobManagerAddress);
    }

    event Proposed(uint256 epoch,
                    uint256 stakerId,
                    uint256[] jobIds,
                    uint256[] medians,
                    uint256[] lowerCutoffs,
                    uint256[] higherCutoffs,
                    uint256 iteration,
                    uint256 biggestStakerId,
                    uint256 timestamp);

    // elected proposer proposes block. we use a probabilistic method to elect stakers weighted by stake
    // protocol works like this. select a staker pseudorandomly (not weighted by anything)
    // (todo what if it is below min stake)
    // that staker then tosses a biased coin. bias = hisStake/biggestStake. if its heads, he can propose block
    // end of iteration. try next iteration
    // note that only one staker or no stakers selected in each iteration.
    // stakers elected in higher iterations can also propose hoping that
    // stakers with lower iteration do not propose for some reason
    function propose (uint256 epoch,
                    uint256[] memory jobIds,
                    uint256[] memory medians,
                    uint256[] memory lowerCutoffs,
                    uint256[] memory higherCutoffs,
                    uint256 iteration,
                    uint256 biggestStakerId) public checkEpoch(epoch) checkState(Constants.propose()) {
        uint256 proposerId = stakeManager.getStakerId(msg.sender);
        // SchellingCoin sch = SchellingCoin(schAddress);
        require(isElectedProposer(iteration, biggestStakerId, proposerId), "not elected");
        require(stakeManager.getStaker(proposerId).stake >= Constants.minStake(), "stake below minimum stake");

        // check if someone already proposed
        // if (blocks[epoch].proposerId != 0) {
        //     if (blocks[epoch].proposerId == proposerId) {
        //         revert("Already Proposed");
        //     }
        //     // if (stakers[biggestStakerId].stake == blocks[epoch].biggestStake &&
        //     //     proposedBlocks[epoch].length >= Constants.maxAltBlocks()) {
        //     //
        //     //     require(proposedBlocks[epoch][4].iteration > iteration,
        //     //             "iteration not smaller than last elected staker");
        //     // } else
        //     if (stakers[biggestStakerId].stake < blocks[epoch].biggestStake) {
        //         revert("biggest stakers stake not bigger than as proposed by existing elected staker ");
        //     }
        // }
        // blocks[epoch]
        _insertAppropriately(epoch, Structs.Block(proposerId,
                            jobIds,
                            medians,
                            lowerCutoffs,
                            higherCutoffs,
                            iteration,
                            stakeManager.getStaker(biggestStakerId).stake,
                            true));
        // emit DebugUint256(pushAt);
        // mint and give block reward
        // if (Constants.blockReward() > 0) {
        //     stakers[proposerId].stake = stakers[proposerId].stake.add(Constants.blockReward());
        //     totalStake = totalStake.add(Constants.blockReward());
        //     require(sch.mint(address(this), Constants.blockReward()));
        // }
        emit Proposed(epoch, proposerId, jobIds, medians, lowerCutoffs, higherCutoffs, iteration, biggestStakerId, now);
    }

    //anyone can give sorted votes in batches in dispute state
    function giveSorted (uint256 epoch, uint256 assetId, uint256[] memory sorted) public
    checkEpoch(epoch) checkState(Constants.dispute()) {
        uint256 medianWeight = voteManager.getTotalStakeRevealed(epoch, assetId).div(2);
        uint256 lowerCutoffWeight = voteManager.getTotalStakeRevealed(epoch, assetId).div(4);
        uint256 higherCutoffWeight = (voteManager.getTotalStakeRevealed(epoch, assetId).mul(3)).div(4);
        uint256 accWeight = disputes[epoch][msg.sender].accWeight;
        uint256 lastVisited = disputes[epoch][msg.sender].lastVisited;
        if (disputes[epoch][msg.sender].accWeight == 0) {
            disputes[epoch][msg.sender].assetId = assetId;
        } else {
            require(disputes[epoch][msg.sender].assetId == assetId, "AssetId not matching");
        }
        for (uint256 i = 0; i < sorted.length; i++) {
            require(sorted[i] > lastVisited, "sorted[i] is not greater than lastVisited");
            lastVisited = sorted[i];
            accWeight = accWeight.add(voteManager.getVoteWeight(epoch, assetId, sorted[i]));
            //set  median, if conditions meet
            if (disputes[epoch][msg.sender].lowerCutoff == 0 && accWeight >= lowerCutoffWeight) {
                disputes[epoch][msg.sender].lowerCutoff = sorted[i];
            }
            if (disputes[epoch][msg.sender].median == 0 && accWeight > medianWeight) {
                disputes[epoch][msg.sender].median = sorted[i];
            }
            if (disputes[epoch][msg.sender].higherCutoff == 0 && accWeight > higherCutoffWeight) {
                disputes[epoch][msg.sender].higherCutoff = sorted[i];
            }
            //TODO verify how much gas required for below operations and update this value
            if (gasleft() < 10000) break;
        }
        disputes[epoch][msg.sender].lastVisited = lastVisited;
        disputes[epoch][msg.sender].accWeight = accWeight;
    }

    // //todo test
    // //if any mistake made during giveSorted, resetDispute and start again
    function resetDispute (uint256 epoch) public checkEpoch(epoch) checkState(Constants.dispute()) {
        disputes[epoch][msg.sender] = Structs.Dispute(0, 0, 0, 0, 0, 0);
    }

    function finalizeDispute (uint256 epoch, uint256 blockId)
    public checkEpoch(epoch) checkState(Constants.dispute()) {
        uint256 assetId = disputes[epoch][msg.sender].assetId;
        require(disputes[epoch][msg.sender].accWeight == voteManager.getTotalStakeRevealed(epoch, assetId),
        "Total stake revealed doesnt match");
        uint256 median = disputes[epoch][msg.sender].median;
        uint256 lowerCutoff = disputes[epoch][msg.sender].lowerCutoff;
        uint256 higherCutoff = disputes[epoch][msg.sender].higherCutoff;
        uint256 proposerId = proposedBlocks[epoch][blockId].proposerId;
        //
        require(median > 0);
        if (proposedBlocks[epoch][blockId].medians[assetId] != median ||
            proposedBlocks[epoch][blockId].lowerCutoffs[assetId] != lowerCutoff ||
            proposedBlocks[epoch][blockId].higherCutoffs[assetId] != higherCutoff) {
            proposedBlocks[epoch][blockId].valid = false;
            stakeManager.slash(proposerId, msg.sender, epoch);
        } else {
            revert("Proposed Alternate block is identical to proposed block");
        }
    }

    function isElectedProposer(uint256 iteration, uint256 biggestStakerId, uint256 stakerId) public view returns(bool) {
       // rand = 0 -> totalStake-1
       //add +1 since prng returns 0 to max-1 and staker start from 1
        if ((Random.prng(10, stakeManager.getNumStakers(), keccak256(abi.encode(iteration))).add(1))
        != stakerId) {return(false);}
        bytes32 randHash = Random.prngHash(10, keccak256(abi.encode(stakerId, iteration)));
        uint256 rand = uint256(randHash).mod(2**32);
        uint256 biggestStake = stakeManager.getStaker(biggestStakerId).stake;
        if (rand.mul(biggestStake) > stakeManager.getStaker(stakerId).stake.mul(2**32)) return(false);
        return(true);
    }

    event BlockConfirmed(uint256 epoch,
                    uint256 stakerId,
                    uint256[] medians,
                    uint256[] lowerCutoffs,
                    uint256[] higherCutoffs,
                    uint256[] jobIds,
                    uint256 timestamp);

    function confirmBlock() public onlyRole(Constants.getBlockConfirmerHash()) {
        uint256 epoch = stateManager.getEpoch();
        
        for (uint8 i=0; i < proposedBlocks[epoch - 1].length; i++) {
            if (proposedBlocks[epoch - 1][i].valid) {
                blocks[epoch - 1] = proposedBlocks[epoch - 1][i];
                uint256 proposerId = proposedBlocks[epoch - 1][i].proposerId;
                emit BlockConfirmed(epoch - 1,
                                    proposerId,
                                    proposedBlocks[epoch - 1][i].medians,
                                    proposedBlocks[epoch - 1][i].lowerCutoffs,
                                    proposedBlocks[epoch - 1][i].higherCutoffs,
                                    proposedBlocks[epoch - 1][i].jobIds,
                                    now);
                for (uint8 j = 0; j < proposedBlocks[epoch - 1][i].jobIds.length; j++) {
                    jobManager.fulfillJob(proposedBlocks[epoch - 1][i].jobIds[j],
                                        proposedBlocks[epoch - 1][i].medians[j]);
                }
                stakeManager.giveBlockReward(proposerId, epoch);
                return;
            }
        }
        
    }

    function _insertAppropriately(uint256 epoch, Structs.Block memory _block) internal {
       // uint256 iteration = _block.iteration;
        if (proposedBlocks[epoch].length == 0) {
            proposedBlocks[epoch].push(_block);
            return;
        }
       // Structs.Block[] memory temp = proposedBlocks[epoch];
       // delete (proposedBlocks[epoch]);
       // bool pushed = false;
       // bool empty = true;
        uint256 pushAt = proposedBlocks[epoch].length;
        for (uint256 i = 0; i < proposedBlocks[epoch].length; i++) {
            if (proposedBlocks[epoch][i].biggestStake < _block.biggestStake) {
                pushAt = i;
                break;
            }
            if (proposedBlocks[epoch][i].iteration > _block.iteration) {
                pushAt = i;
                break;
            }
        }

        proposedBlocks[epoch].push(_block);
        for (uint256 j = proposedBlocks[epoch].length - 1; j > (pushAt); j--) {
            proposedBlocks[epoch][j] = proposedBlocks[epoch][j - 1];
        }
        // if (pushAt < proposedBlocks[epoch].length) {

        proposedBlocks[epoch][pushAt] = _block;
        // }
        // if (pushed == false && temp.length < Constants.maxAltBlocks()) {
        //     proposedBlocks[epoch].push(_block);
        // }
        if (proposedBlocks[epoch].length > Constants.maxAltBlocks()) {
            delete (proposedBlocks[epoch][proposedBlocks[epoch].length - 1]);
        }
    }


}
