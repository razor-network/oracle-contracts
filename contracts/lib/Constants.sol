pragma solidity 0.5.10;


library Constants {
    function commit() public pure returns(uint8) { return(0);}
    function reveal() public pure returns(uint8) { return(1);}
    function propose() public pure returns(uint8) { return(2);}
    function dispute() public pure returns(uint8) { return(3);}
    // penalty not reveal = 0.01% per epch
    function penaltyNotRevealNum() public pure returns(uint256) { return (1);}
    function penaltyNotRevealDenom() public pure returns(uint256) { return (10000); }
    // uint256 constant PENALTY_NOT_IN_ZONE_NUM = 99;
    // uint256 constant PENALTY_NOT_IN_ZONE_DENOM = 100;
    function minStake() public pure returns(uint256) { return(100*(10**uint256(18))); }
    function blockReward() public pure returns(uint256) { return(5*(10**uint256(18)));}
    // uint256 constant REVEAL_REWARD = 5;
    // function safetyMarginLower() public pure returns(uint256) { return(99); }
    function unstakeLockPeriod() public pure returns(uint256) { return(1); }
    function withdrawLockPeriod() public pure returns(uint256) { return(1); }
    function maxAltBlocks() public pure returns(uint256) { return(5); }
    function epochLength() public pure returns(uint256) { return(40); }
    function numStates() public pure returns(uint256) { return(4); }
    function exposureDenominator() public pure returns(uint256) { return(1000); }

 // Constants(0, 1, 2, 3, 1, 10000, 99, 100, 1000, 5, 5, 99, 1, 1);
}
