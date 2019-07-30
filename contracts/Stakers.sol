pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;
import "./SimpleToken.sol";
import "./Votes.sol";
import "./Blocks.sol";
import "./States.sol";
import "./Incentives.sol";

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/Constants.sol";
import "./lib/SharedStructs.sol";

contract Stakers {

    mapping (address => uint256) public stakerIds;
    mapping (uint256 => SharedStructs.Staker) public stakers;
    uint256 public numStakers = 0;

    // address public schAddress;

    event Unstaked(uint256 stakerId);
    
    // constructor (address _schAddress) public {
    //     schAddress = _schAddress;
    // }

    modifier checkEpoch (uint256 epoch) {
        require(epoch == States.getEpoch(), "incorrect epoch");
        _;
    }

    modifier checkState (uint256 state) {
        require(state == States.getState(), "incorrect state");
        _;
    }

    event Staked(uint256 nodeId, uint256 amount);

    function stake (uint256 epoch, uint256 amount) public checkEpoch(epoch) checkState(Constants.commit()) {
    SimpleToken sch = SimpleToken(Incentives.schAddress);
     //not allowed during reveal period
    require(States.getState() != Constants.reveal());
    require(amount >= Constants.minStake(), "staked amount is less than minimum stake required");
    require(sch.transferFrom(msg.sender, address(this), amount), "sch transfer failed");
    uint256 stakerId = stakerIds[msg.sender];
    if (stakerId == 0) {
        numStakers = numStakers.add(1);
        stakers[numStakers] = SharedStructs.Node(numStakers, amount, epoch, 0, 0, epoch.add(Constants.unstakeLockPeriod()), 0);
        stakerId = numStakers;
        stakerIds[msg.sender] = stakerId;
    } else {
        require(stakers[stakerId].stake > 0,
                "adding stake is not possible after withdrawal/slash. Please use a new address");
        stakers[stakerId].stake = stakers[stakerId].stake.add(amount);
    }
    // totalStake = totalStake.add(amount);
    emit Staked(stakerId, amount);
}

    function unstake (uint256 epoch) public {

	    uint256 stakerId = stakerIds[msg.sender];
	    SharedStructs.Staker storage staker = stakers[stakerId];
	    require(staker.id != 0);
	    require(staker.stake > 0, "Nonpositive stake");
	    require(staker.unstakeAfter <= epoch && staker.unstakeAfter != 0);
	    staker.unstakeAfter = 0;
	    staker.withdrawAfter = epoch.add(Constants.withdrawLockPeriod());
	    emit Unstaked(stakerId);
	}

    event Withdrew(uint256 stakerId, uint256 amount);
    function withdraw (uint256 epoch) public {
        uint256 stakerId = stakerIds[msg.sender];
        SharedStructs.Staker storage staker = stakers[stakerId];
        require(staker.id != 0, "staker doesnt exist");
        require(staker.epochLastRevealed == epoch.sub(1), "Didnt reveal in last epoch");
        require(staker.unstakeAfter == 0, "Did not unstake");
        require((staker.withdrawAfter <= epoch) && staker.withdrawAfter != 0, "Withdraw epoch not reached");
        require(Votes.commitments[epoch][stakerId] == 0x0, "already commited this epoch. Cant withdraw");
        Incentives.givePenalties(staker, epoch);
        require(staker.stake > 0, "Nonpositive Stake");
        SimpleToken sch = SimpleToken(Incentives.schAddress);
        // totalStake = totalStake.sub(stakers[stakerId].stake);
        stakers[stakerId].stake = 0;
        emit Withdrew(stakerId, stakers[stakerId].stake);
        require(sch.transfer(msg.sender, stakers[stakerId].stake));
	}

}