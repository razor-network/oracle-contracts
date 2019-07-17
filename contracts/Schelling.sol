pragma solidity 0.5.10;
import "./SimpleToken.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

// WARNING IN development
// Must Vote price rounded to 2 decimals *100 and must be above 0
// e.g. if ethusd is 169.99 vote 16999
// invalid vote cannot be revealed and you will get penalty
// node == staker

// TODO Priority list
// test unstake and withdraw
// cases where nobody votes, too low stake (1-4)
// nobody proposes, nobody disputes, extending dispute period
// staker wants to vote but cant because below minimum. how to handle? should he be penalized? how much waiting time?
// use openzeppelin math to avoid under and overflows

contract Schelling {
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

    // twoFive = twentyFive percentile value
    // sevenFive = seventyFive percentile value
    struct Block {
        uint256 proposerId;
        uint256 median;
        uint256 twoFive;
        uint256 sevenFive;
        uint256 stakeGettingReward;
        uint256 stakeGettingPenalty;
        uint256 iteration;
        uint256 biggestStake;
    }

    struct Dispute {
        uint256 accWeight;
        uint256 twoFive;
        uint256 sevenFive;
        uint256 median;
        uint256 lastVisited;
        uint256 stakeGettingReward;
        uint256 stakeGettingPenalty;
    }

    mapping (address => uint256) public nodeIds;
    mapping (uint256 => Node) public nodes;
    mapping (uint256 => mapping (uint256 => bytes32)) public commitments;
    mapping (uint256 => mapping (uint256 => Vote)) public votes;
    mapping(uint256 => uint256) public totalStakeRevealed;
    mapping (uint256 => Block) public blocks;

    mapping (uint256 => mapping (uint256 => uint256)) public voteWeights;

    mapping(uint256 => mapping(address => Dispute)) public disputes;
    address public schAddress;

    uint256 public numNodes = 0;
    uint256 public totalStake = 0;

    struct Constants {
        uint8 COMMIT;
        uint8 REVEAL;
        uint8 PROPOSE;
        uint8 DISPUTE;
        uint256 PENALTY_NOT_REVEAL_NUM;
        uint256 PENALTY_NOT_REVEAL_DENOM;
        uint256 PENALTY_NOT_IN_ZONE_NUM;
        uint256 PENALTY_NOT_IN_ZONE_DENOM;
        uint256 MIN_STAKE;
        uint256 BLOCK_REWARD;
        uint256 REVEAL_REWARD;
        uint256 SAFETY_MARGIN_LOWER;
        // uint256 SAFETY_MARGIN_UPPER;
        uint256 UNSTAKE_LOCK_PERIOD;
        uint256 WITHDRAW_LOCK_PERIOD;
    }

    uint256 EPOCH;
    uint256 STATE;

    Constants public c = Constants(0, 1, 2, 3, 95, 100, 99, 100, 1000, 5, 5, 99, 1, 1);

    constructor (address _schAddress) public {
        schAddress = _schAddress;
    }

    modifier checkEpoch (uint256 epoch) {
        require(epoch == getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint8 state) {
        require(state == getState(), "incorrect state");
        _;
    }

    event Staked(uint256 nodeId, uint256 amount);

    // stake during commit state only
    // we check epoch during every transaction to avoid withholding and rebroadcasting attacks
    function stake (uint256 epoch, uint256 amount) public checkEpoch(epoch) checkState(c.COMMIT) {
        SimpleToken sch = SimpleToken(schAddress);
         //not allowed during reveal period
        require(getState() != c.REVEAL);
        require(amount >= c.MIN_STAKE, "staked amount is less than minimum stake required");
        require(sch.transferFrom(msg.sender, address(this), amount), "sch transfer failed");
        uint256 nodeId = nodeIds[msg.sender];
        if (nodeId == 0) {
            numNodes = numNodes.add(1);
            nodes[numNodes] = Node(numNodes, amount, epoch, 0, 0, epoch.add(c.UNSTAKE_LOCK_PERIOD), 0);
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

    event Unstaked(uint256 nodeId);

    // staker must call unstake() and continue voting for c.WITHDRAW_LOCK_PERIOD
    //after which she can call withdraw() to finally Withdraw
    function unstake (uint256 epoch) public checkEpoch(epoch) {
        // require(getState()!= 1); //not allowed during reveal period
        uint256 nodeId = nodeIds[msg.sender];
        Node storage node = nodes[nodeId];
        require(node.id != 0);
        require(node.stake > 0, "Nonpositive stake");
        require(node.unstakeAfter <= epoch && node.unstakeAfter != 0);
        node.unstakeAfter = 0;
        node.withdrawAfter = epoch.add(c.WITHDRAW_LOCK_PERIOD);
        emit Unstaked(nodeId);
    }

    event Withdrew(uint256 nodeId);

    function withdraw (uint256 epoch) public checkEpoch(epoch) checkState(c.COMMIT) {
        uint256 nodeId = nodeIds[msg.sender];
        Node storage node = nodes[nodeId];
        require(node.id != 0, "node doesnt exist");
        require(node.epochLastRevealed == epoch.sub(1), "Didnt reveal in last epoch");
        require(node.unstakeAfter == 0, "Did not unstake");
        require((node.withdrawAfter <= epoch) && node.withdrawAfter != 0, "Withdraw epoch not reached");
        require(node.stake > 0, "Nonpositive Stake");
        require(commitments[epoch][nodeId] == 0x0, "already commited this epoch. Cant withdraw");
        SimpleToken sch = SimpleToken(schAddress);
        uint256 toSend = nodes[nodeId].stake;
        totalStake = totalStake.sub(nodes[nodeId].stake);
        nodes[nodeId].stake = 0;
        emit Withdrew(nodeId);
        require(sch.transfer(msg.sender, toSend));
    }

    event Committed(uint256 nodeId, bytes32 commitment);

    // what was the eth/usd rate at the beginning of this epoch?
    function commit (uint256 epoch, bytes32 commitment) public checkEpoch(epoch) checkState(c.COMMIT) {
        uint256 nodeId = nodeIds[msg.sender];
        Node storage thisStaker = nodes[nodeId];
        require(thisStaker.stake >= c.MIN_STAKE, "stake is below minimum stake");
        require(commitments[epoch][nodeId] == 0x0, "already commited");
        commitments[epoch][nodeId] = commitment;
        thisStaker.epochLastCommitted = epoch;
        emit Committed(nodeId, commitment);
    }

    event Revealed(uint256 nodeId, uint256 value);

    function reveal (uint256 epoch, uint256 value, bytes32 secret, address stakerAddress)
    public
    checkEpoch(epoch) {
        uint256 thisNodeId = nodeIds[stakerAddress];
        require(thisNodeId > 0, "Node does not exist");
        Node storage thisStaker = nodes[thisNodeId];
        require(commitments[epoch][thisNodeId] != 0x0, "not commited or already revealed");
        require(value > 0, "voted non positive value");
        require(keccak256(abi.encodePacked(epoch, value, secret)) == commitments[epoch][thisNodeId],
                "incorrect secret");
        emit Revealed(thisNodeId, value);
        //if revealing self
        if (msg.sender == stakerAddress) {
            require(getState() == c.REVEAL, "Not reveal state");
            require(thisStaker.stake > 0, "nonpositive stake");
            givePenaltiesAndRewards(thisStaker, epoch);
            votes[epoch][thisNodeId] = Vote(value, thisStaker.stake);
            commitments[epoch][thisNodeId] = 0x0;
            totalStakeRevealed[epoch] = totalStakeRevealed[epoch].add(thisStaker.stake);
            voteWeights[epoch][value] = voteWeights[epoch][value].add(thisStaker.stake);
            thisStaker.epochLastRevealed = epoch;
        } else {
            //bounty hunter revealing someone else's secret in commit state
            require(getState() == c.COMMIT, "Not commit state");
            commitments[epoch][thisNodeId] = 0x0;
            slash(thisNodeId, msg.sender);
        }
    }

    function isElectedProposer(uint256 iteration, uint256 biggestStakerId, uint256 nodeId) public view returns(bool) {
        // rand = 0 -> totalStake-1
        //add +1 since prng returns 0 to max-1 and node start from 1
        if ((prng(10, numNodes, keccak256(abi.encode(iteration))).add(1)) != nodeId) return(false);
        bytes32 randHash = prngHash(10, keccak256(abi.encode(nodeId, iteration)));
        uint256 rand = uint256(randHash).mod(2**32);
        uint256 biggestStake = nodes[biggestStakerId].stake;
        if (rand.mul(biggestStake) > nodes[nodeId].stake.mul(2**32)) return(false);
        return(true);
    }

    event Proposed(uint256 epoch,
                    uint256 median,
                    uint256 twoFive,
                    uint256 sevenFive,
                    uint256 stakeGettingPenalty,
                    uint256 stakeGettingReward,
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
                    uint256 median,
                    uint256 twoFive,
                    uint256 sevenFive,
                    uint256 stakeGettingPenalty,
                    uint256 stakeGettingReward,
                    uint256 iteration,
                    uint256 biggestStakerId) public checkEpoch(epoch) checkState(c.PROPOSE) {
        uint256 proposerId = nodeIds[msg.sender];
        SimpleToken sch = SimpleToken(schAddress);
        require(isElectedProposer(iteration, biggestStakerId, proposerId), "not elected");
        require(nodes[proposerId].stake >= c.MIN_STAKE, "stake below minimum stake");

        //check if someone already proposed
        if (blocks[epoch].proposerId != 0) {
            if (nodes[biggestStakerId].stake == blocks[epoch].biggestStake) {
                require(blocks[epoch].iteration > iteration, "iteration not bigger than existing elected staker");
            } else if (nodes[biggestStakerId].stake < blocks[epoch].biggestStake) {
                revert("biggest stakers stake not bigger than as proposed by existing elected staker ");
            }
        }
        // twoFive == 0 if no one votes
        // require(twoFive > 0);
        require(median >= twoFive);
        require(sevenFive >= median);
        require(stakeGettingReward <= totalStake);
        require(stakeGettingPenalty <= totalStake);
        blocks[epoch] = Block(proposerId,
                                median,
                                twoFive,
                                sevenFive,
                                stakeGettingReward,
                                stakeGettingPenalty,
                                iteration,
                                nodes[biggestStakerId].stake);
        if (c.BLOCK_REWARD > 0) {
            nodes[proposerId].stake = nodes[proposerId].stake.add(c.BLOCK_REWARD);
            totalStake = totalStake.add(c.BLOCK_REWARD);
            require(sch.mint(address(this), c.BLOCK_REWARD));
        }
        emit Proposed(epoch, median, twoFive, sevenFive, stakeGettingPenalty,
                    stakeGettingReward, iteration, biggestStakerId);
    }

    //anyone can give sorted votes in batches in dispute state
    function giveSorted (uint256 epoch, uint256[] memory sorted) public checkEpoch(epoch) checkState(c.DISPUTE) {
        uint256 twoFiveWeight = totalStakeRevealed[epoch].div(4);
        uint256 medianWeight = totalStakeRevealed[epoch].div(2);
        uint256 sevenFiveWeight = (totalStakeRevealed[epoch].mul(3)).div(4);
        //accumulatedWeight
        uint256 accWeight = disputes[epoch][msg.sender].accWeight;
        uint256 lastVisited = disputes[epoch][msg.sender].lastVisited;

        uint256 stakeGettingReward;
        uint256 stakeGettingPenalty;

        for (uint256 i = 0; i < sorted.length; i++) {
            require(sorted[i] > lastVisited, "sorted[i] is not greater than lastVisited");
            lastVisited = sorted[i];
            accWeight = accWeight.add(voteWeights[epoch][sorted[i]]);

            //set twofive, median, sevenFive if conditions meet
            if (disputes[epoch][msg.sender].twoFive == 0 && accWeight >= twoFiveWeight) {
                disputes[epoch][msg.sender].twoFive = sorted[i];
            }
            if (disputes[epoch][msg.sender].median == 0 && accWeight > medianWeight) {
                disputes[epoch][msg.sender].median = sorted[i];
            }
            if (disputes[epoch][msg.sender].sevenFive == 0 && accWeight > sevenFiveWeight) {
                disputes[epoch][msg.sender].sevenFive = sorted[i];
            }

            if ((sorted[i] == disputes[epoch][msg.sender].twoFive) ||
                (disputes[epoch][msg.sender].twoFive == 0) ||
                disputes[epoch][msg.sender].sevenFive > 0) {
                // (sorted[i] > disputes[epoch][msg.sender].sevenFive && disputes[epoch][msg.sender].sevenFive > 0)) {
                stakeGettingPenalty = stakeGettingPenalty.add(voteWeights[epoch][sorted[i]]);
            } else {
                stakeGettingReward = stakeGettingReward.add(voteWeights[epoch][sorted[i]]);
            }
            //TODO verify how much gas required for below operations and update this value
            if (gasleft() < 10000) break;
        }

        disputes[epoch][msg.sender].lastVisited = lastVisited;
        disputes[epoch][msg.sender].accWeight = accWeight;
        disputes[epoch][msg.sender].stakeGettingPenalty = disputes[epoch][msg.sender].stakeGettingPenalty.add(
                                                        stakeGettingPenalty);
        disputes[epoch][msg.sender].stakeGettingReward = disputes[epoch][msg.sender].stakeGettingReward.add(
                                                        stakeGettingReward);
    }

    //todo test
    //if any mistake made during giveSorted, resetDispute and start again
    function resetDispute (uint256 epoch) public checkEpoch(epoch) checkState(c.DISPUTE) {
        disputes[epoch][msg.sender] = Dispute(0, 0, 0, 0, 0, 0, 0);
    }

    //propose alternate block in dispute phase
    //if no one votes, skip giveSorted and proposeAlt directly.
    function proposeAlt (uint256 epoch) public checkEpoch(epoch) checkState(c.DISPUTE) {
        require(disputes[epoch][msg.sender].accWeight == totalStakeRevealed[epoch]);
        uint256 median = disputes[epoch][msg.sender].median;
        uint256 twoFive = disputes[epoch][msg.sender].twoFive;
        uint256 sevenFive = disputes[epoch][msg.sender].sevenFive;
        uint256 stakeGettingReward = disputes[epoch][msg.sender].stakeGettingReward;
        uint256 stakeGettingPenalty = disputes[epoch][msg.sender].stakeGettingPenalty;
        uint256 bountyHunterId = nodeIds[msg.sender];
        uint256 proposerId = blocks[epoch].proposerId;

        require(twoFive >= 0);
        require(median >= twoFive);
        require(sevenFive >= median);
        if (blocks[epoch].sevenFive != sevenFive ||
            blocks[epoch].median != median ||
            blocks[epoch].twoFive != twoFive ||
            blocks[epoch].stakeGettingReward != stakeGettingReward ||
            blocks[epoch].stakeGettingPenalty != stakeGettingPenalty) {
            blocks[epoch] = Block(bountyHunterId, median, twoFive, sevenFive,
                                    stakeGettingReward, stakeGettingPenalty, 0, 0);
            emit Proposed(epoch, median, twoFive, sevenFive, stakeGettingPenalty, stakeGettingReward, 0, 0);
            slash(proposerId, msg.sender);
        } else {
            revert("Proposed Alternate block as identical to proposed block");
        }
    }

    function getEpoch () public view returns(uint256) {
        return(EPOCH);
        return((block.number.div(16)).add(1));
    }

    function getState() public view returns(uint256) {
        return (STATE);
        uint256 state = (block.number.div(4));

        return (state.mod(4));
    }

    // pseudo random number generator based on block hashes. returns 0 -> max-1
    function prng (uint8 numBlocks, uint256 max, bytes32 seed) public view returns (uint256) {
        bytes32 hashh = prngHash(numBlocks, seed);
        uint256 sum = uint256(hashh);
        return(sum.mod(max));
    }

    // pseudo random hash generator based on block hashes.
    function prngHash(uint8 numBlocks, bytes32 seed) public view returns(bytes32) {
        bytes32 sum;
        uint256 blockNumberEpochStart = (block.number.div(16)).mul(16);
        for (uint8 i = 1; i <= numBlocks; i++) {
            sum = keccak256(abi.encodePacked(sum, blockhash(blockNumberEpochStart.sub(i))));
        }
        sum = keccak256(abi.encodePacked(sum, seed));
        return(sum);
    }

    // WARNING TODO FOR TESTING ONLY. REMOVE IN PROD
    function setEpoch (uint256 epoch) public { EPOCH = epoch;}

    function setState (uint256 state) public { STATE = state;}

    // dummy function to forcibly increase block number in ganache
    function dum () public {true;}
    // END TESTING FUNCTIONS

    // internal functions vvvvvvvv
    function givePenaltiesAndRewards(Node storage thisStaker, uint256 epoch) internal {
        if (epoch > 1) {
            uint256 epochLastActive = thisStaker.epochStaked < thisStaker.epochLastRevealed ?
                                    thisStaker.epochLastRevealed :
                                    thisStaker.epochStaked;
            // penalize or reward if last active more than epoch - 1
            uint256 penalizeEpochs = epoch.sub(epochLastActive).sub(1);
            uint256 epochLastRevealed = thisStaker.epochLastRevealed;
            thisStaker.stake = (thisStaker.stake.mul(c.PENALTY_NOT_REVEAL_NUM**(penalizeEpochs))).div(
            c.PENALTY_NOT_REVEAL_DENOM**(penalizeEpochs));

            uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id].value;

            //reward for in zone
            if (voteLastEpoch > 0 &&
                blocks[epochLastRevealed].stakeGettingReward > 0 &&
                voteLastEpoch >= (blocks[epochLastRevealed].median.mul(c.SAFETY_MARGIN_LOWER)).div(100) &&
                voteLastEpoch <= (blocks[epochLastRevealed].median.mul(uint256(200).sub(
                                    c.SAFETY_MARGIN_LOWER))).div(100)) {
                if (voteLastEpoch >= blocks[epochLastRevealed].twoFive &&
                voteLastEpoch <= blocks[epochLastRevealed].sevenFive) {
                    thisStaker.stake = thisStaker.stake.add(
                                    (thisStaker.stake.mul(
                                    blocks[epochLastRevealed].stakeGettingPenalty)).div(
                                    ((blocks[epochLastRevealed].stakeGettingReward).mul(100))));
                } else {
                    // penalty for outside zone
                    thisStaker.stake = (thisStaker.stake.mul(c.PENALTY_NOT_IN_ZONE_NUM)).div(
                                        c.PENALTY_NOT_IN_ZONE_DENOM);
                }
            }
        }
    }

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
