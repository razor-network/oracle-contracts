pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "../SimpleToken.sol";
import "./Utils.sol";
// import "./StakeManager.sol";
import "../lib/Random.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../lib/Structs.sol";


contract BlockManager is Utils {
    using SafeMath for uint256;

    event Proposed(uint256 epoch,
                    uint256 stakerId,
                    uint256[] medians,
                    uint256 iteration,
                    uint256 biggestStakerId);

    // elected proposer proposes block. we use a probabilistic method to elect stakers weighted by stake
    // protocol works like this. select a staker pseudorandomly (not weighted by anything)
    // (todo what if it is below min stake)
    // that staker then tosses a biased coin. bias = hisStake/biggestStake. if its heads, he can propose block
    // end of iteration. try next iteration
    // note that only one staker or no stakers selected in each iteration.
    // stakers elected in higher iterations can also propose hoping that
    // stakers with lower iteration do not propose for some reason
    function propose (uint256 epoch,
                    uint256[] memory medians,
                    uint256 iteration,
                    uint256 biggestStakerId) public checkEpoch(epoch) checkState(Constants.propose()) {
        uint256 proposerId = stakerIds[msg.sender];
        // SimpleToken sch = SimpleToken(schAddress);
        require(isElectedProposer(iteration, biggestStakerId, proposerId), "not elected");
        require(stakers[proposerId].stake >= Constants.minStake(), "stake below minimum stake");

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
        uint256 pushAt = insertAppropriately(epoch, Structs.Block(proposerId,
                                        medians,
                                        iteration,
                                        stakers[biggestStakerId].stake,
                                        true));
        emit DebugUint256(pushAt);
        // mint and give block reward
        // if (Constants.blockReward() > 0) {
        //     stakers[proposerId].stake = stakers[proposerId].stake.add(Constants.blockReward());
        //     totalStake = totalStake.add(Constants.blockReward());
        //     require(sch.mint(address(this), Constants.blockReward()));
        // }
        emit Proposed(epoch, proposerId, medians, iteration, biggestStakerId);
    }

    //anyone can give sorted votes in batches in dispute state
    function giveSorted (uint256 epoch, uint256 assetId, uint256[] memory sorted) public
    checkEpoch(epoch) checkState(Constants.dispute()) {
        uint256 medianWeight = totalStakeRevealed[epoch][assetId].div(2);
        //accWeight = accumulatedWeight
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
            accWeight = accWeight.add(voteWeights[epoch][assetId][sorted[i]]);
            //set  median, if conditions meet
            if (disputes[epoch][msg.sender].median == 0 && accWeight > medianWeight) {
                disputes[epoch][msg.sender].median = sorted[i];
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
        disputes[epoch][msg.sender] = Structs.Dispute(0, 0, 0, 0);
    }

    function finalizeDispute (uint256 epoch, uint256 blockId)
    public checkEpoch(epoch) checkState(Constants.dispute()) {
        uint256 assetId = disputes[epoch][msg.sender].assetId;
        require(disputes[epoch][msg.sender].accWeight == totalStakeRevealed[epoch][assetId]);
        uint256 median = disputes[epoch][msg.sender].median;
        // uint256 bountyHunterId = stakerIds[msg.sender];
        uint256 proposerId = proposedBlocks[epoch][blockId].proposerId;

        require(median > 0);
        if (proposedBlocks[epoch][blockId].medians[assetId] != median) {
            // blocks[epoch] = Structs.Block(bountyHunterId, median,
                                    // 0, 0);
            // emit Proposed(epoch, proposerId, median, 0, 0);
            proposedBlocks[epoch][blockId].valid = false;
            slash(proposerId, msg.sender);
        } else {
            revert("Proposed Alternate block is identical to proposed block");
        }
    }

    function isElectedProposer(uint256 iteration, uint256 biggestStakerId, uint256 stakerId) public view returns(bool) {
       // rand = 0 -> totalStake-1
       //add +1 since prng returns 0 to max-1 and staker start from 1
        if ((Random.prng(10, numStakers, keccak256(abi.encode(iteration))).add(1)) != stakerId) return(false);
        bytes32 randHash = Random.prngHash(10, keccak256(abi.encode(stakerId, iteration)));
        uint256 rand = uint256(randHash).mod(2**32);
        uint256 biggestStake = stakers[biggestStakerId].stake;
        if (rand.mul(biggestStake) > stakers[stakerId].stake.mul(2**32)) return(false);
        return(true);
    }

    function insertAppropriately(uint256 epoch, Structs.Block memory _block) internal returns(uint256) {
       // uint256 iteration = _block.iteration;
        if (proposedBlocks[epoch].length == 0) {
            proposedBlocks[epoch].push(_block);
            return(0);
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
        return(pushAt);
    }

}
