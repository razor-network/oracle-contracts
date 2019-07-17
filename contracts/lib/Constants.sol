pragma solidity 0.5.10;


library Constants {
    function commit() public pure returns(uint8) { return(0);}
    function reveal() public pure returns(uint8) { return(1);}
    function propose() public pure returns(uint8) { return(2);}
    function dispute() public pure returns(uint8) { return(3);}
    uint256 constant PENALTY_NOT_REVEAL_NUM = 1;
    uint256 constant PENALTY_NOT_REVEAL_DENOM = 10000;
    uint256 constant PENALTY_NOT_IN_ZONE_NUM = 99;
    uint256 constant PENALTY_NOT_IN_ZONE_DENOM = 100;
    function minStake() public pure returns(uint256) { return(1000); }
    function blockReward() public pure returns(uint8) { return(5);}
    uint256 constant REVEAL_REWARD = 5;
    uint256 constant SAFETY_MARGIN_LOWER = 99;
    function unstakeLockPeriod() public pure returns(uint256) { return(1); }
    uint256 constant WITHDRAW_LOCK_PERIOD = 1;
    function maxAltBlocks() public pure returns(uint256) { return(5); }

 // Constants(0, 1, 2, 3, 1, 10000, 99, 100, 1000, 5, 5, 99, 1, 1);
}
