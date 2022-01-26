## Razor Params
#### Incentivised Testnet - 1
#### Commit [580af18](https://github.com/razor-network/contracts/tree/580af180bf20d6ca3ab487428725f15adaf9afae)

|No.| Parameter  |Purpose | DefaultValue |  To Change |
|---|---|---|---|---|---|
|1|penaltyNotRevealNum  | inactivity penalty | 1 => 0.01 % | 100 (1%) | 
|2|blockReward  | reward for block producer | 100 RZR |  |  
|3|gracePeriod  | skip inactivity penalty | 8 | 2 | 
|4|maxAge  | To cap how far your influence can go | 100 |  |  | 
|5| maxTolerance  | allow small fluctuation to not harm low infl stakers  | 1000 => 10 %| |
|6|slashParams (bounty, burn, keep)  |  Snitch, Dispute | (500, 9500, 0) => (5%, 95%, 0) | |  
|7|deltaCommission  | allow to +- by only specific, in locked periods | 3 |  |  
|8|epochLimitForUpdateCommission  | locked updates | 100 epochs (l-300), 1000 min  | 33 epochs (l-900), 990 mins,  |  
|9|minStake  | least amount to participate | 20000 RZR | 100k|
|10|minSafeRazor  | least amount to be staked first   | 10000 RZR | 75 k|
|11|withdrawLockPeriod  | period after unstake after which withdraw can happen   | 1 epoch(l-300) | 48 epochs(l-900), 24 hours|
|12|withdrawReleasePeriod  | range after withdrawlock period in which only withdraw can happen   | 5 epochs(l-300) | 48 epochs(l-900), 24 hours |
|13|extendLockPenalty  | disincentives pre-empt withdraws  | 1% |  | 
|14|maxAltBlocks  | to safe guard disputed blocks   | 5 |  | 
|15| epochLength | no of blocks for one epoch |	300 (10 mins) | 900 (30 mins) |
