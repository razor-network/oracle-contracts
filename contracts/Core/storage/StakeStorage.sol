// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../lib/Structs.sol";

contract StakeStorage {
    enum LockType {
        Unstake,
        Withdraw
    }
    /// @notice total number of stakers
    // slither-disable-next-line constable-states
    uint32 public numStakers;
    /// @notice total number of bounties given out
    // slither-disable-next-line constable-states
    uint32 public bountyCounter;

    /// @notice mapping of staker address -> staker id info
    mapping(address => uint32) public stakerIds;
    /// @notice mapping of staker id -> staker info
    mapping(uint32 => Structs.Staker) public stakers;
    /// @notice mapping of staker/delegator address -> staker sRZR address -> LockType -> Lock info
    mapping(address => mapping(address => mapping(LockType => Structs.Lock))) public locks;
    /// @notice mapping of bounty id -> bounty lock info
    mapping(uint32 => Structs.BountyLock) public bountyLocks;
    /// @notice maturity calculation for each index = [math.floor(math.sqrt(i*10000)/2) for i in range(1,100)]
    uint16[101] public maturities = [
        50,
        70,
        86,
        100,
        111,
        122,
        132,
        141,
        150,
        158,
        165,
        173,
        180,
        187,
        193,
        200,
        206,
        212,
        217,
        223,
        229,
        234,
        239,
        244,
        250,
        254,
        259,
        264,
        269,
        273,
        278,
        282,
        287,
        291,
        295,
        300,
        304,
        308,
        312,
        316,
        320,
        324,
        327,
        331,
        335,
        339,
        342,
        346,
        350,
        353,
        357,
        360,
        364,
        367,
        370,
        374,
        377,
        380,
        384,
        387,
        390,
        393,
        396,
        400,
        403,
        406,
        409,
        412,
        415,
        418,
        421,
        424,
        427,
        430,
        433,
        435,
        438,
        441,
        444,
        447,
        450,
        452,
        455,
        458,
        460,
        463,
        466,
        469,
        471,
        474,
        476,
        479,
        482,
        484,
        487,
        489,
        492,
        494,
        497,
        500,
        502
    ];
}
