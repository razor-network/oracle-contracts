# Staking Guide

This guide explains how to participate in the Oracle Network through staking RAZOR tokens.

## Overview

Staking is the primary mechanism for participating in the Oracle Network. By staking RAZOR tokens, participants:
- Secure the network
- Earn rewards
- Participate in data reporting
- Gain voting rights

## Staking Process

### 1. Prerequisites

Before staking, ensure you have:
- RAZOR tokens in your wallet
- Minimum required stake amount
- ETH for transaction fees

### 2. Direct Staking

```solidity
// 1. Approve RAZOR tokens
IERC20(razorAddress).approve(stakeManager, amount);

// 2. Stake tokens
stakeManager.stake(currentEpoch, amount);
```

When you stake:
1. Your RAZOR tokens are locked in the contract
2. You receive sRZR tokens representing your stake
3. Your staker ID is assigned
4. You can start participating in oracle operations

### 3. Stake Management

#### Adding More Stake
```solidity
stakeManager.stake(currentEpoch, additionalAmount);
```

#### Checking Your Stake
```solidity
uint256 stake = stakeManager.getStake(stakerId);
uint256 influence = stakeManager.getInfluence(stakerId);
```

#### Understanding Maturity
- Stake maturity increases over time
- Higher maturity = more influence
- Influence = Stake × Maturity
- Maturity resets on penalties

## Unstaking Process

### 1. Initiate Unstake
```solidity
stakeManager.unstake(stakerId, sRZRAmount);
```

### 2. Wait Lock Period
- Must wait `unstakeLockPeriod` epochs
- Lock prevents quick withdrawals
- Ensures network security

### 3. Initiate Withdrawal
```solidity
stakeManager.initiateWithdraw(stakerId);
```

### 4. Complete Withdrawal
```solidity
stakeManager.unlockWithdraw(stakerId);
```

## Rewards

### Types of Rewards
1. Block Rewards
   - For proposing valid blocks
   - Based on stake size

2. Reporting Rewards
   - For accurate data reporting
   - Based on participation

3. Age Rewards
   - For long-term staking
   - Based on maturity

### Claiming Rewards
```solidity
stakeManager.claimStakerReward();
```

## Security Considerations

### 1. Slashing Conditions
- Invalid data reporting
- Malicious behavior
- Inactivity
- Protocol violations

### 2. Slashing Penalties
- Loss of stake
- Reset of maturity
- Temporary exclusion

### 3. Best Practices
- Monitor your node
- Maintain uptime
- Report accurately
- Stay informed

## Node Operation

### 1. Setup Requirements
- Reliable hardware
- Stable internet
- Regular maintenance
- Security measures

### 2. Monitoring
- Watch performance
- Check rewards
- Monitor slashing
- Track influence

## Advanced Topics

### 1. Commission Management
```solidity
// Set delegation acceptance
stakeManager.setDelegationAcceptance(true);

// Update commission rate
stakeManager.updateCommission(newRate);
```

### 2. Lock Extensions
```solidity
// Reset unstake lock if needed
stakeManager.resetUnstakeLock(stakerId);
```

### 3. Influence Optimization
- Balance stake size
- Maintain uptime
- Avoid penalties
- Build maturity

## Troubleshooting

### Common Issues

1. **Failed Stake**
   - Insufficient balance
   - Not approved
   - Below minimum

2. **Failed Unstake**
   - Existing locks
   - Wrong timing
   - Invalid amount

3. **Failed Withdrawal**
   - Lock period active
   - Wrong timing
   - System paused

## Best Practices

1. **Risk Management**
   - Start small
   - Increase gradually
   - Monitor performance
   - Maintain reserves

2. **Operational Excellence**
   - Regular monitoring
   - Quick response
   - Stay updated
   - Community engagement

3. **Long-term Strategy**
   - Build maturity
   - Optimize influence
   - Plan upgrades
   - Network participation

## Related Documentation
- [Core Concepts](../core-concepts.md)
- [API Reference](../api-reference.md)
- [Architecture](../architecture.md)