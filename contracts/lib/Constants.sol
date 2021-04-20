// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;


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
    // uint256 constant REVEAL_REWARD = 5;
    // function safetyMarginLower() public pure returns(uint256) { return(99); }
    function unstakeLockPeriod() public pure returns(uint256) { return(1); }
    function withdrawLockPeriod() public pure returns(uint256) { return(1); }
    function maxAltBlocks() public pure returns(uint256) { return(5); }
    function epochLength() public pure returns(uint256) { return(40); }
    function numStates() public pure returns(uint256) { return(4); }
    function exposureDenominator() public pure returns(uint256) { return(1000); }

    function getJobConfirmerHash() public pure returns(bytes32) { return(0xbe7b58e17bf6adaa0f209cd0db8b128282fc68a42f2dd649b4d8ea579f1b078f); /*keccak256("JOB_CONFIRMER_ROLE")*/}
    function getBlockConfirmerHash() public pure returns(bytes32) { return(0x18797bc7973e1dadee1895be2f1003818e30eae3b0e7a01eb9b2e66f3ea2771f);/*keccak256("BLOCK_CONFIRMER_ROLE"))*/}
    function getStakeModifierHash() public pure returns(bytes32) { return(0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804);/*keccak256("STAKE_MODIFIER_ROLE"))*/}
    function getStakerActivityUpdaterHash() public pure returns(bytes32) { return(0x4cd3070aaa07d03ab33731cbabd0cb27eb9e074a9430ad006c96941d71b77ece); /*keccak256("STAKER_ACTIVITY_UPDATER_ROLE"))*/}
    function getDefaultAdminHash() public pure returns(bytes32) { return(0x0000000000000000000000000000000000000000000000000000000000000000);}
}
