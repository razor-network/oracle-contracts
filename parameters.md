## Razor Params

#### Commit [580af18](https://github.com/razor-network/contracts/tree/580af180bf20d6ca3ab487428725f15adaf9afae)

|No.| Parameter  |Purpose | CurrentValue |  Is it okay ? | Resolution
|---|---|---|---|---|---|
|1|penaltyNotRevealNum  | inactivity penalty | 1 => 0.01 % | too low ? |  |
|2|blockReward  | reward for block producer | 100 RZR |  |  |
|3|gracePeriod  | skip inactivity penalty | 8 |  |  |
|4|maxAge  | To cap how far your influence can go | 100 | 100 epochs takes if we consider 300 as epoch length and 2 sec blocks, only 41 hours to reach max |  | |
|5| maxTolerance  | allow small fluctuation to not harm low infl stakers  | 8 |  1000 => 10 % to high ? | |
|6|slashParams (bounty, burn, keep)  |  Snitch, Dispute | (500, 9500, 0) => (5%, 95%, 0) | |  |
|7|deltaCommission  | allow to +- by only specific, in locked periods | 3 |  |  |
|8|epochLimitForUpdateCommission  | locked updates | 100 |  |  |
|9|minStake  | least amount to participate | 20000 RZR |  |  | |
|10|minSafeRazor  | least amount to be staked first   | 10000 RZR |  | |
|11|withdrawLockPeriod  | period after unstake after which withdraw can happen   | 1 | to low, allows switch to winning staker ? | |
|12|withdrawReleasePeriod  | range after withdrawlock period in which only withdraw can happen   | 5 |  via 300 as length and 2 sec blocks, 50 mins| |
|13|extendLockPenalty  | disincentives pre-empt withdraws  | 1% |  | |
|14|maxAltBlocks  | to safe guard disputed blocks   | 5 |  | |
|15|epochLength  | no of blocks for one epoch   | 300 | should be adjusted per chain  | |