pragma solidity 0.5.7;
import "./SimpleToken.sol";
// WARNING IN development
// Must Vote price rounded to 2 decimals *100 and must be above 0
// e.g. if ethusd is 169.99 vote 16999
// invalid vote cannot be revealed and you will get penalty

// TODO Priority list
// prng should count blocks from start of epoch
// test unstake and withdraw
//add epoch and state restrictions

contract Schelling {

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
    mapping(uint256 => uint256) public totalStakeRevealed;
    mapping (uint256 => mapping (uint256 => bytes32)) public commitments;
    mapping (uint256 => mapping (uint256 => Vote)) public votes;
    mapping (uint256 => Block) public blocks;

    mapping (uint256 => mapping (uint256 => uint256)) public voteWeights;

    mapping(uint256 => mapping(address => Dispute)) public disputes;
    address public schAddress;

    mapping (uint256 => Node) public nodes;
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
        uint256 EPOCH;//8
        uint256 STATE;
        uint256 MIN_STAKE; //10
        uint256 BLOCK_REWARD;
        uint256 UNSTAKE_LOCK_PERIOD; //12
        uint256 WITHDRAW_LOCK_PERIOD; //13
    }

    Constants public c = Constants(0, 1, 2, 3, 95, 100, 99, 100, 0, 0, 1000, 5, 1, 1);

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

    function stake (uint256 epoch, uint256 amount) public checkEpoch(epoch) {
        SimpleToken sch = SimpleToken(schAddress);
         //not allowed during reveal period
        require(getState() != c.REVEAL);
        require(amount >= c.MIN_STAKE, "staked amount is less than minimum stake required");
        require(sch.transferFrom(msg.sender, address(this), amount), "sch transfer failed");
        uint256 nodeId = nodeIds[msg.sender];
        if (nodeId == 0) {
            numNodes = numNodes + 1;
            nodes[numNodes] = Node(numNodes, amount, epoch, 0, 0, epoch + c.UNSTAKE_LOCK_PERIOD, 0);
            nodeId = numNodes;
            nodeIds[msg.sender] = nodeId;
        } else {
            nodes[nodeId].stake = nodes[nodeId].stake + amount;
        }
        totalStake = totalStake + amount;
        emit Staked(nodeId, amount);
    }

    event Unstaked(uint256 nodeId);

    function unstake (uint256 epoch) public checkEpoch(epoch) {
        // require(getState()!= 1); //not allowed during reveal period
        uint256 nodeId = nodeIds[msg.sender];
        Node storage node = nodes[nodeId];
        require(node.id != 0);
        require(node.unstakeAfter < epoch && node.unstakeAfter != 0);
        node.unstakeAfter = 0;
        node.withdrawAfter = epoch + c.WITHDRAW_LOCK_PERIOD;
        emit Unstaked(nodeId);
    }

    event Withdrew(uint256 nodeId);

    function withdraw (uint256 epoch) public checkEpoch(epoch) {
        uint256 nodeId = nodeIds[msg.sender];
        Node storage node = nodes[nodeId];
        require(node.id != 0, "node doesnt exist");
        require(node.epochLastRevealed >= epoch - 1, "Didnt reveal in last or current epoch");
        require(node.unstakeAfter == 0, "Did not unstake");
        require((node.withdrawAfter < epoch) && node.withdrawAfter != 0, "Withdraw epoch not eached");
        SimpleToken sch = SimpleToken(schAddress);
        uint256 toSend = nodes[nodeId].stake;
        totalStake = totalStake - nodes[nodeId].stake;
        nodes[nodeId].stake = 0;
        sch.transfer(msg.sender, toSend);
        emit Withdrew(nodeId);
    }

    event Committed(uint256 nodeId, bytes32 commitment);

    // vote in the first 250 blocks every epoch, else get penalty
    // what was the eth/usd rate at the beginning of this epoch?
    function commit (uint256 epoch, bytes32 commitment) public checkEpoch(epoch) checkState(c.COMMIT) {
        // require(getState() == 0, "wrong state");
        uint256 nodeId = nodeIds[msg.sender];
        Node storage thisStaker = nodes[nodeId];
        require(thisStaker.stake > c.MIN_STAKE, "stake is below minimum stake");

        require(commitments[epoch][nodeId] == 0x0, "already commited");

        commitments[epoch][nodeId] = commitment;
        thisStaker.epochLastCommitted = epoch;
        emit Committed(nodeId, commitment);
    }

    event Revealed(uint256 nodeId, uint256 value);

    //todo bounty only available in commit state
    function reveal (uint256 epoch, uint256 value, bytes32 secret, address stakerAddress)
    public
    checkEpoch(epoch) {
        //if staked last epoch, no penalty
        // if epoch last revealed <epoch-1 & epochlastrevealed >epoch staked+1 penalty
        uint256 thisNodeId = nodeIds[stakerAddress];
        require(thisNodeId > 0, "Node does not exist");
        Node storage thisStaker = nodes[thisNodeId];
        require(commitments[epoch][thisNodeId] != 0x0, "not commited or already revealed");
        require(value > 0, "voted non positive value");
        require(keccak256(abi.encodePacked(epoch, value, secret)) == commitments[epoch][thisNodeId],
                "incorrect secret");
        //if revealing self
        if (msg.sender == stakerAddress) {
            require(getState() == c.REVEAL, "Not reveal state");
            if (epoch > 1) {
                //penalty for not revealing
                uint256 epochLastActive = thisStaker.epochStaked < thisStaker.epochLastRevealed ?
                                        thisStaker.epochLastRevealed :
                                        thisStaker.epochStaked;
                // penalize or reward if last active more than epoch - 1
                if (epochLastActive < epoch - 1) {
                    uint256 penalizeEpochs = epoch - epochLastActive - 1;
                    uint256 epochLastRevealed = thisStaker.epochLastRevealed;
                    thisStaker.stake = (thisStaker.stake * c.PENALTY_NOT_REVEAL_NUM**(penalizeEpochs))
                    / c.PENALTY_NOT_REVEAL_DENOM**(penalizeEpochs);

                    uint256 voteLastEpoch = votes[epochLastRevealed][thisStaker.id].value;
                    //reward for in zone
                    if (voteLastEpoch > 0 && blocks[epochLastRevealed].stakeGettingReward > 0) {
                        if (voteLastEpoch >= blocks[epochLastRevealed].twoFive &&
                        voteLastEpoch <= blocks[epochLastRevealed].sevenFive) {
                            thisStaker.stake = thisStaker.stake +
                                            (thisStaker.stake *
                                            blocks[epochLastRevealed].stakeGettingPenalty) /
                                            (100*blocks[epochLastRevealed].stakeGettingReward);
                        } else {
                        // penalty for outside zone
                            thisStaker.stake = (thisStaker.stake * c.PENALTY_NOT_IN_ZONE_NUM) /
                                                c.PENALTY_NOT_IN_ZONE_DENOM;
                        }
                    }
                }
            }
            require(thisStaker.stake > 0, "nonpositive stake");
            votes[epoch][thisNodeId] = Vote(value, thisStaker.stake);
            commitments[epoch][thisNodeId] = 0x0;
            totalStakeRevealed[epoch] = totalStakeRevealed[epoch] + thisStaker.stake;
            voteWeights[epoch][value] = voteWeights[epoch][value] + thisStaker.stake;
            thisStaker.epochLastRevealed = epoch;

        } else {
            require(getState() == c.COMMIT, "Not commit state");
            commitments[epoch][thisNodeId] = 0x0;
            slash(thisNodeId, msg.sender);
        }
        emit Revealed(thisNodeId, value);

    }

    function isElectedProposer(uint256 iteration, uint256 biggestStakerId, uint256 nodeId) public view returns(bool) {
        // rand = 0 -> totalStake-1
        //add +1 since prng returns 0 to max-1 and node start from 1
        if ((prng(10, numNodes, keccak256(abi.encode(iteration))) + 1) != nodeId) return(false);
        bytes32 randHash = prngHash(10, keccak256(abi.encode(nodeId, iteration)));
        uint256 rand = uint256(randHash) % 2**32;
        uint256 biggestStake = nodes[biggestStakerId].stake;
        if (rand * biggestStake > nodes[nodeId].stake * 2**32) return(false);
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
        require(nodes[proposerId].stake > c.MIN_STAKE, "stake below minimum stake");
        // require(getState() == 2);

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
        sch.mint(address(this), c.BLOCK_REWARD);
        nodes[proposerId].stake = nodes[proposerId].stake + c.BLOCK_REWARD;
        totalStake = totalStake + c.BLOCK_REWARD;
        emit Proposed(epoch, median, twoFive, sevenFive, stakeGettingPenalty,
                    stakeGettingReward, iteration, biggestStakerId);
    }

    //todo resetDisute(_)
    function giveSorted (uint256 epoch, uint256[] memory sorted) public checkEpoch(epoch) checkState(c.DISPUTE) {
        // require(getState() == 3);
        uint256 twoFiveWeight = totalStakeRevealed[epoch] / 4;
        uint256 medianWeight = totalStakeRevealed[epoch] / 2;
        uint256 sevenFiveWeight = (totalStakeRevealed[epoch] * 3) / 4;

        uint256 accWeight = disputes[epoch][msg.sender].accWeight;
        uint256 lastVisited = disputes[epoch][msg.sender].lastVisited;
        // uint256 twoFive = disputes[epoch][msg.sender].twoFive;
        // uint256 median = disputes[epoch][msg.sender].median;
        // uint256 sevenFive = disputes[epoch][msg.sender].sevenFive;

        uint256 stakeGettingReward;
        uint256 stakeGettingPenalty;

        for (uint256 i = 0; i < sorted.length; i++) {
            require(sorted[i] > lastVisited, "sorted[i] is not greater than lastVisited");
            lastVisited = sorted[i];
            accWeight = accWeight + voteWeights[epoch][sorted[i]];

            if (disputes[epoch][msg.sender].twoFive == 0 && accWeight >= twoFiveWeight) {
                disputes[epoch][msg.sender].twoFive = sorted[i];
            }
            if (disputes[epoch][msg.sender].median == 0 && accWeight > medianWeight) {
                disputes[epoch][msg.sender].median = sorted[i];
            }
            if (disputes[epoch][msg.sender].sevenFive == 0 && accWeight > sevenFiveWeight) {
                disputes[epoch][msg.sender].sevenFive = sorted[i];
            }

            if (//(sorted[i] == disputes[epoch][msg.sender].twoFive) ||
                (disputes[epoch][msg.sender].twoFive == 0) ||
                (sorted[i] > disputes[epoch][msg.sender].sevenFive && disputes[epoch][msg.sender].sevenFive > 0)) {
                    stakeGettingPenalty = stakeGettingPenalty + voteWeights[epoch][sorted[i]];
                } else {
                    stakeGettingReward = stakeGettingReward + voteWeights[epoch][sorted[i]];
                }
            if (gasleft() < 5000) break;
        }
        // disputes[epoch][msg.sender].twoFive = twoFive;
        // disputes[epoch][msg.sender].median = median;
        // disputes[epoch][msg.sender].sevenFive = sevenFive;

        disputes[epoch][msg.sender].lastVisited = lastVisited;
        disputes[epoch][msg.sender].accWeight = accWeight;
        disputes[epoch][msg.sender].stakeGettingPenalty = disputes[epoch][msg.sender].stakeGettingPenalty +
                                                        stakeGettingPenalty;
        disputes[epoch][msg.sender].stakeGettingReward = disputes[epoch][msg.sender].stakeGettingReward +
                                                        stakeGettingReward;
    }

    //propose in dispute phase
    function proposeAlt (uint256 epoch) public checkEpoch(epoch) checkState(c.DISPUTE) {
        // require(getState() == 4);
        require(disputes[epoch][msg.sender].accWeight == totalStakeRevealed[epoch]);
        uint256 median = disputes[epoch][msg.sender].median;
        uint256 twoFive = disputes[epoch][msg.sender].twoFive;
        uint256 sevenFive = disputes[epoch][msg.sender].sevenFive;
        uint256 stakeGettingReward = disputes[epoch][msg.sender].stakeGettingReward;
        uint256 stakeGettingPenalty = disputes[epoch][msg.sender].stakeGettingPenalty;
        uint256 proposerId = nodeIds[msg.sender];

        // TODO check state
        require(twoFive >= 0);
        require(median >= twoFive);
        require(sevenFive >= median);
        // if (blocks[epoch].sevenFive > 0) {
        if (blocks[epoch].sevenFive != sevenFive ||
            blocks[epoch].median != median ||
            blocks[epoch].twoFive != twoFive) {
            slash(blocks[epoch].proposerId, msg.sender); //50% - 50% slash
        } else {
            revert("Proposed Alternate block as same as proposed block");
        }
        blocks[epoch] = Block(proposerId, median, twoFive, sevenFive, stakeGettingReward, stakeGettingPenalty, 0, 0);
        emit Proposed(epoch, median, twoFive, sevenFive, stakeGettingPenalty,
                    stakeGettingReward, 0, 0);

    }

    function getEpoch () public view returns(uint256) {
        // return(c.EPOCH);
        return((block.number/16) + 1);
    }

    // TODO complete getState()
    function getState() public view returns(uint256) {
        // return (c.STATE);
        uint256 state = (block.number/4);

        return state%4;
    }

    // returns 0 -> max-1
    function prng (uint8 numBlocks, uint256 max, bytes32 seed) public view returns (uint256) {
        bytes32 hashh = prngHash(numBlocks, seed);
        uint256 sum = uint256(hashh);
        return(sum%max);
    }

    function prngHash(uint8 numBlocks, bytes32 seed) public view returns(bytes32) {
        bytes32 sum;
        // TODO uncomment in prod
        uint256 blockNumberEpochStart = (block.number/16)*16;
        // uint256 blockNumberEpochStart = block.number;
        for (uint8 i = 1; i <= numBlocks; i++) {
            sum = keccak256(abi.encodePacked(sum, blockhash(blockNumberEpochStart - i)));
        }
        sum = keccak256(abi.encodePacked(sum, seed));
        return(sum);
    }

    // WARNING TODO FOR TESTING ONLY. REMOVE IN PROD
    function setEpoch (uint256 epoch) public { c.EPOCH = epoch;}

    function setState (uint256 state) public { c.STATE = state;}

    function dum () public {true;}
    // END TESTING FUNCTIONS
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

    function slash (uint256 id, address bountyHunter) internal {
        SimpleToken sch = SimpleToken(schAddress);
        // if(fixedAmount > 0) {
        //     stakeTransfer(id, bountyHunter, fixedAmount);
        // }
        uint256 thisStake = nodes[id].stake;
        nodes[id].stake = 0;
        //TODO WHAT IF IT IS 0???
        totalStake = totalStake - thisStake / uint256(2);
        require(sch.transfer(bountyHunter, thisStake / uint256(2)), "failed to transfer bounty");
    }

}
