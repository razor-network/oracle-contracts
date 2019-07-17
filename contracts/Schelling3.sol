pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "./SimpleToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/Random.sol";
import "./lib/Constants.sol";
import "openzeppelin-solidity/contracts/cryptography/MerkleProof.sol";

// WARNING IN development
// Must Vote price rounded to 2 decimals *100 and must be above 0
// e.g. if ethusd is 169.99 vote 16999
// invalid vote cannot be revealed and you will get penalty
// node == staker
// TODO Priority list
// nobody proposes, nobody disputes, extending dispute period
// staker wants to vote but cant because below minimum. how to handle? should he be penalized? how much waiting time?

// new algo
//give reward and penalty in state 1 not state 2. because someone may defect in state 2 and leave in next epoch state 1
//calculate penalty in state 1 and distribute reward in state 2
//state 2 divide reward to those who committed in state 1 and distribute. if they dont participate, too bad.
// newvariables. global rewardpool.
contract Schelling3 {
    using SafeMath for uint256;

    struct Vote {
        uint256 value;
        uint256 weight;
    }

    struct Node {
        uint256 id;
        uint256 stake;
        uint256 epochStaked;
        uint256 epochLastCommitted;
        uint256 epochLastRevealed;
        uint256 unstakeAfter;
        uint256 withdrawAfter;
    }

    struct Block {
        uint256 proposerId;
        uint256[] medians;
        uint256 iteration;
        uint256 biggestStake;
    }

    struct Dispute {
        uint256 accWeight;
        uint256 median;
        uint256 lastVisited;
        uint256 assetId;
    }

    mapping (address => uint256) public nodeIds;
    mapping (uint256 => Node) public nodes;
    //epoch->stakerid->commitment
    mapping (uint256 => mapping (uint256 => bytes32)) public commitments;
    //epoch->stakerid->assetid->vote
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => Vote))) public votes;
    // epoch -> asset -> stakeWeight
    mapping (uint256 =>  mapping (uint256 => uint256)) public totalStakeRevealed;
    mapping (uint256 => Block) public blocks;
    //epoch->assetid->voteValue->weight
    mapping (uint256 => mapping (uint256 =>  mapping (uint256 => uint256))) public voteWeights;
    //epoch->address->dispute->assetid->
    mapping (uint256 => mapping (address => Dispute)) public disputes;
    //epoch -> numProposedBlocks
    mapping (uint256 => uint256) public numProposedBlocks;
    //epoch -> proposalNumber -> block
    mapping (uint256 => mapping (uint256 => Block)) public proposedBlocks;
    address public schAddress;

    uint256 public numNodes = 0;
    uint256 public totalStake = 0;

    uint256 public EPOCH;
    uint256 public STATE;
    uint256 public rewardPool = 0;
    uint256 public stakeGettingReward = 0;

    // Constants public c = Constants(0, 1, 2, 3, 1, 10000, 99, 100, 1000, 5, 5, 99, 1, 1);
//
    constructor (address _schAddress) public {
        schAddress = _schAddress;
    }

    modifier checkEpoch (uint256 epoch) {
        require(epoch == getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == getState(), "incorrect state");
        _;
    }

    //for some reasom, getter for block doesnt return medians array. so using this for now
    function getBlock (uint256 blockNumber) public view returns(uint256, uint256[] memory medians, uint256, uint256) {
      // uint256 proposerId;
      // uint256[] medians;
      // uint256 iteration;
      // uint256 biggestStake;
        Block memory _block = blocks[blockNumber];
        medians = _block.medians;
        return(_block.proposerId, medians, _block.iteration, _block.biggestStake);
    }

    event Staked(uint256 nodeId, uint256 amount);

    // stake during commit state only
    // we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    function stake (uint256 epoch, uint256 amount) public checkEpoch(epoch) checkState(Constants.commit()) {
        SimpleToken sch = SimpleToken(schAddress);
         //not allowed during reveal period
        //require(getState() != Constants.REVEAL);
        require(amount >= Constants.minStake(), "staked amount is less than minimum stake required");
        require(sch.transferFrom(msg.sender, address(this), amount), "sch transfer failed");
        uint256 nodeId = nodeIds[msg.sender];
        if (nodeId == 0) {
            numNodes = numNodes.add(1);
            nodes[numNodes] = Node(numNodes, amount, epoch, 0, 0, epoch.add(Constants.unstakeLockPeriod()), 0);
            nodeId = numNodes;
            nodeIds[msg.sender] = nodeId;
        } else {
            require(nodes[nodeId].stake > 0,
                    "adding stake is not possible after withdrawal/slash. Please use a new address");
            nodes[nodeId].stake = nodes[nodeId].stake.add(amount);
        }
        totalStake = totalStake.add(amount);
        emit Staked(nodeId, amount);
    }

    // // event Unstaked(uint256 nodeId);
    // //
    // // // staker must call unstake() and continue voting for Constants.WITHDRAW_LOCK_PERIOD
    // // //after which she can call withdraw() to finally Withdraw
    // // function unstake (uint256 epoch) public checkEpoch(epoch) {
    // //     // require(getState()!= 1); //not allowed during reveal period
    // //     uint256 nodeId = nodeIds[msg.sender];
    // //     Node storage node = nodes[nodeId];
    // //     require(node.id != 0);
    // //     require(node.stake > 0, "Nonpositive stake");
    // //     require(node.unstakeAfter <= epoch && node.unstakeAfter != 0);
    // //     node.unstakeAfter = 0;
    // //     node.withdrawAfter = epoch.add(Constants.WITHDRAW_LOCK_PERIOD);
    // //     emit Unstaked(nodeId);
    // // }
    // //
    // // event Withdrew(uint256 nodeId, uint256 amount);
    //
    // // function withdraw (uint256 epoch) public checkEpoch(epoch) checkState(Constants.COMMIT) {
    // //     uint256 nodeId = nodeIds[msg.sender];
    // //     Node storage node = nodes[nodeId];
    // //     require(node.id != 0, "node doesnt exist");
    // //     require(node.epochLastRevealed == epoch.sub(1), "Didnt reveal in last epoch");
    // //     require(node.unstakeAfter == 0, "Did not unstake");
    // //     require((node.withdrawAfter <= epoch) && node.withdrawAfter != 0, "Withdraw epoch not reached");
    // //     require(commitments[epoch][nodeId] == 0x0, "already commited this epoch. Cant withdraw");
    // //     givePenalties(node, epoch);
    // //     require(node.stake > 0, "Nonpositive Stake");
    // //     SimpleToken sch = SimpleToken(schAddress);
    // //     totalStake = totalStake.sub(nodes[nodeId].stake);
    // //     nodes[nodeId].stake = 0;
    // //     emit Withdrew(nodeId, nodes[nodeId].stake);
    // //     require(sch.transfer(msg.sender, nodes[nodeId].stake));
    // // }
    //
    event Committed(uint256 epoch, uint256 nodeId, bytes32 commitment);
    //
    event Y(uint256 y);
    //
    // // what was the eth/usd rate at the beginning of this epoch?

    function commit (uint256 epoch, bytes32 commitment) public checkEpoch(epoch) checkState(Constants.commit()) {
        uint256 nodeId = nodeIds[msg.sender];
        require(commitments[epoch][nodeId] == 0x0, "already commited");
        Node storage thisStaker = nodes[nodeId];
        // uint256 y = givePenalties(thisStaker, epoch);
        // emit Y(y);
        if (thisStaker.stake >= Constants.minStake()) {
            commitments[epoch][nodeId] = commitment;
            thisStaker.epochLastCommitted = epoch;
            emit Committed(epoch, nodeId, commitment);
        }
    }

    event Revealed(uint256 epoch, uint256 nodeId, uint256 value, uint256 stake);

    function reveal (uint256 epoch, bytes32 root, uint256[] memory values,
                    bytes32[][] memory proofs, bytes32 secret, address stakerAddress)
    public
    checkEpoch(epoch) {
        uint256 thisNodeId = nodeIds[stakerAddress];
        require(thisNodeId > 0, "Node does not exist");
        Node storage thisStaker = nodes[thisNodeId];
        require(commitments[epoch][thisNodeId] != 0x0, "not commited or already revealed");
        // require(value > 0, "voted non positive value");
        require(keccak256(abi.encodePacked(epoch, root, secret)) == commitments[epoch][thisNodeId],
                "incorrect secret/value");
        //if revealing self
        if (msg.sender == stakerAddress) {
            for (uint256 i = 0; i < values.length; i++) {
                require(MerkleProof.verify(proofs[i], root, keccak256(abi.encodePacked(values[i]))));
                votes[epoch][thisNodeId][i] = Vote(values[i], thisStaker.stake);
                voteWeights[epoch][i][values[i]] = voteWeights[epoch][i][values[i]].add(thisStaker.stake);
                totalStakeRevealed[epoch][i] = totalStakeRevealed[epoch][i].add(thisStaker.stake);

            }

            require(getState() == Constants.reveal(), "Not reveal state");
            require(thisStaker.stake > 0, "nonpositive stake");
            // giveRewards(thisStaker, epoch);

            commitments[epoch][thisNodeId] = 0x0;
            thisStaker.epochLastRevealed = epoch;
            // emit Revealed(epoch, thisNodeId, value, thisStaker.stake);
        } else {
            //bounty hunter revealing someone else's secret in commit state
            require(getState() == Constants.commit(), "Not commit state");
            commitments[epoch][thisNodeId] = 0x0;
            slash(thisNodeId, msg.sender);
        }
    }

    function isElectedProposer(uint256 iteration, uint256 biggestStakerId, uint256 nodeId) public view returns(bool) {
        // rand = 0 -> totalStake-1
        //add +1 since prng returns 0 to max-1 and node start from 1
        if ((Random.prng(10, numNodes, keccak256(abi.encode(iteration))).add(1)) != nodeId) return(false);
        bytes32 randHash = Random.prngHash(10, keccak256(abi.encode(nodeId, iteration)));
        uint256 rand = uint256(randHash).mod(2**32);
        uint256 biggestStake = nodes[biggestStakerId].stake;
        if (rand.mul(biggestStake) > nodes[nodeId].stake.mul(2**32)) return(false);
        return(true);
    }

    event Proposed(uint256 epoch,
                    uint256 nodeId,
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
        uint256 proposerId = nodeIds[msg.sender];
        SimpleToken sch = SimpleToken(schAddress);
        require(isElectedProposer(iteration, biggestStakerId, proposerId), "not elected");
        require(nodes[proposerId].stake >= Constants.minStake(), "stake below minimum stake");

        //check if someone already proposed
        if (blocks[epoch].proposerId != 0) {
            if (blocks[epoch].proposerId == proposerId) {
                revert("Already Proposed");
            }
            if (nodes[biggestStakerId].stake == blocks[epoch].biggestStake) {
                require(blocks[epoch].iteration > iteration, "iteration not bigger than existing elected staker");
            } else if (nodes[biggestStakerId].stake < blocks[epoch].biggestStake) {
                revert("biggest stakers stake not bigger than as proposed by existing elected staker ");
            }
        }
        blocks[epoch] = Block(proposerId,
                                medians,
                                iteration,
                                nodes[biggestStakerId].stake);
        // mint and give block reward
        if (Constants.blockReward() > 0) {
            nodes[proposerId].stake = nodes[proposerId].stake.add(Constants.blockReward());
            totalStake = totalStake.add(Constants.blockReward());
            require(sch.mint(address(this), Constants.blockReward()));
        }
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
        disputes[epoch][msg.sender] = Dispute(0, 0, 0, 0);
    }

    // //propose alternate block in dispute phase
    // //if no one votes, skip giveSorted and proposeAlt directly.
    // function proposeAlt (uint256 epoch) public checkEpoch(epoch) checkState(Constants.dispute()) {
    //
    //     require(disputes[epoch][msg.sender].accWeight == totalStakeRevealed[epoch]);
    //     uint256 median = disputes[epoch][msg.sender].median;
    //     uint256 bountyHunterId = nodeIds[msg.sender];
    //     uint256 proposerId = blocks[epoch].proposerId;
    //
    //     require(median > 0);
    //     if (blocks[epoch].median != median) {
    //         blocks[epoch] = Block(bountyHunterId, median,
    //                                 0, 0);
    //         emit Proposed(epoch, proposerId, median, 0, 0);
    //         slash(proposerId, msg.sender);
    //     } else {
    //         revert("Proposed Alternate block as identical to proposed block");
    //     }
    // }

    // WARNING TODO FOR TESTING ONLY. REMOVE IN PROD

    function setEpoch (uint256 epoch) public { EPOCH = epoch;}

    function setState (uint256 state) public { STATE = state;}

    // dummy function to forcibly increase block number in ganache
    function dum () public {true;}
    // END TESTING FUNCTIONS

    function getEpoch () public view returns(uint256) {
        return(EPOCH);
        return(block.number.div(40));
    }

    function getState () public view returns(uint256) {
        return (STATE);
        uint256 state = (block.number.div(10));
        return (state.mod(uint256(4)));
    }

    //return price from last epoch
    function getPrice(uint256 assetId) public view returns (uint256) {
        uint256 epoch = getEpoch();
        return(blocks[epoch-1].medians[assetId]);
    }


    // internal functions vvvvvvvv
    //executed in state 0
    // function calculateInactivityPenalties(uint256 epochs, uint256 stakeValue) public view returns(uint256) {
    //   // this is problematic
    //   // anything to the power of N grows too fast
    //   // stake = stake * 99**e/100**e
    //   // alternative, calculate penalty for 1 epoch * pe
    //
    //     // thisStaker.stake = (thisStaker.stake.mul(Constants.PENALTY_NOT_REVEAL_NUM**(penalizeEpochs.sub(1)))).div(
    //     // Constants.PENALTY_NOT_REVEAL_DENOM**(penalizeEpochs.sub(1)));
    //     if (epochs < 2) {
    //         return(stakeValue);
    //     }
    //     uint256 penalty = (epochs.sub(1)).mul((stakeValue.mul(Constants.PENALTY_NOT_REVEAL_NUM)).div(
    //     Constants.PENALTY_NOT_REVEAL_DENOM));
    //     if (penalty < stakeValue) {
    //         return(stakeValue.sub(penalty));
    //     } else {
    //         return(0);
    //     }
    // }

    // function givePenalties (Node storage thisStaker, uint256 epoch) internal returns(uint256) {
    //     uint256 epochLastRevealed = thisStaker.epochLastRevealed;
    //     if (epoch > 1 && epochLastRevealed > 0) {
    //         uint256 epochLastActive = thisStaker.epochStaked < thisStaker.epochLastRevealed ?
    //                                 thisStaker.epochLastRevealed :
    //                                 thisStaker.epochStaked;
    //         // penalize or reward if last active more than epoch - 1
    //         uint256 penalizeEpochs = epoch.sub(epochLastActive);
    //         uint256 previousStake = thisStaker.stake;
    //         thisStaker.stake = calculateInactivityPenalties(penalizeEpochs, previousStake);
    //
    //
    //
    //         uint256 medianLastEpoch = blocks[epochLastRevealed].median;
    //         uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id].value;
    //         if (medianLastEpoch > 0 && voteLastEpoch > 0) {
    //           // //penalty for out of zone for in zone
    //           // // (y= ((M - x)^2/M^2))- 0.0001
    //           // // (10000((M-x)(M-x)/M*M) - 1)/10000
    //           //for M = 160, x = 10
    //           //
    //           // uint256 y =  ((((medianLastEpoch.sub(voteLastEpoch)).mul(medianLastEpoch.sub(
    //           //             voteLastEpoch))).div(medianLastEpoch.mul(medianLastEpoch))).mul(
    //           //             uint256(10000)));
    //
    //           // should probably simplify this curve to a linear curve
    //           // cut stake by 100% if vote is 0 or >2*M where M is weighted median
    //             uint256 y = (((medianLastEpoch.mul(medianLastEpoch)).add(voteLastEpoch.mul(voteLastEpoch)))
    //                         .sub(medianLastEpoch.mul(voteLastEpoch.mul(2)))).mul(10000)
    //                         .div(medianLastEpoch.mul(medianLastEpoch));
    //             emit Y(y);
    //
    //                        // uint256 y = (10000*(medianLastEpoch*medianLastEpoch + voteLastEpoch*voteLastEpoch
    //                        //            -2*medianLastEpoch*voteLastEpoch))/(
    //                        //              medianLastEpoch*medianLastEpoch);
    //             if (voteLastEpoch > (medianLastEpoch.mul(2))) {
    //                 thisStaker.stake = 0;
    //                 rewardPool = rewardPool.add(previousStake);
    //             } else if (voteLastEpoch > 0 &&
    //                 (voteLastEpoch < (medianLastEpoch.mul(Constants.SAFETY_MARGIN_LOWER)).div(100) ||
    //                 voteLastEpoch > (medianLastEpoch.mul(uint256(200).sub(
    //                                 Constants.SAFETY_MARGIN_LOWER))).div(100))) {
    //                                     // return(y);
    //               //stake = y*stake
    //               // thisStaker.stake = ((y.sub(uint256(1))).mul(thisStaker.stake)).div(uint256(10000));
    //               // thisStaker.stake = thisStaker.stake.sub(((y.sub(uint256(1)))
    //               //.mul(thisStaker.stake)).div(uint256(10000)));
    //               // thisStaker.stake = stakeBefore-(((y-1)*stakeBefore)/10000);
    //
    //                 thisStaker.stake = previousStake.sub(((y.sub(1)).mul(previousStake)).div(10000));
    //
    //                 rewardPool = rewardPool.add(previousStake.sub(thisStaker.stake));
    //             } else {
    //             // reward += stake*(0.0001-y)
    //             // = stake*(1-10000y)/10000
    //             // = stake*()
    //               // stakeGettingReward = stakeGettingReward.add((thisStaker.stake.mul(
    //               //                     uint256(1).sub(uint256(10000).mul(y)))).div(10000));
    //                 stakeGettingReward = stakeGettingReward.add(previousStake);//*(1 - y);
    //             }
    //         }
    //     }
    // }
    //
    // //executed in state 1
    // function giveRewards (Node storage thisStaker, uint256 epoch) internal {
    //     if (epoch > 1 && stakeGettingReward > 0) {
    //         uint256 epochLastRevealed = thisStaker.epochLastRevealed;
    //         uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id].value;
    //         uint256 medianLastEpoch = blocks[epochLastRevealed].median;
    //
    //     //rewardpool*stake*multiplier/stakeGettingReward
    //         // uint256 y =  ((((medianLastEpoch.sub(voteLastEpoch)).mul(medianLastEpoch.sub(
    //         //         voteLastEpoch))).div(medianLastEpoch.mul(medianLastEpoch))).mul(
    //         //         uint256(10000)));
    //         //give rewards if voted in zone
    //         if ((voteLastEpoch * 100 < (99 * medianLastEpoch) || (voteLastEpoch * 100 > (101 * medianLastEpoch)))) {
    //             thisStaker.stake = thisStaker.stake + (thisStaker.stake*rewardPool)/stakeGettingReward;
    //         }
    //     }
    // }

    function slash (uint256 id, address bountyHunter) internal {
        SimpleToken sch = SimpleToken(schAddress);
        uint256 halfStake = nodes[id].stake.div(2);
        nodes[id].stake = 0;
        if (halfStake > 1) {
            totalStake = totalStake.sub(halfStake);
            require(sch.transfer(bountyHunter, halfStake), "failed to transfer bounty");
        }
    }
    // function stakeTransfer(uint256 fromId, address to, uint256 amount) internal{
    //     // uint256 fromId = nodeIds[from];
    //     require(fromId!=0);
    //     require(nodes[fromId].stake >= amount);
    //     uint256 toId = nodeIds[to];
    //     nodes[fromId].stake = nodes[fromId].stake - amount;
    //     if (toId == 0) {
    //         numNodes = numNodes + 1;
    //         nodes[numNodes] = Node(numNodes, amount, 0, 0, 0);
    //         nodeIds[to] = numNodes;
    //     } else {
    //         nodes[toId].stake = nodes[toId].stake + amount;
    //     }
    // }

}
