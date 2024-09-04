// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Constants {
    enum State {
        Commit,
        Reveal,
        Propose,
        Dispute,
        Confirm,
        Buffer
    }

    enum StakeChanged {
        BlockReward,
        InactivityPenalty,
        Slashed
    }

    enum StakerRewardChanged {
        StakerRewardAdded,
        StakerRewardClaimed
    }

    enum AgeChanged {
        InactivityPenalty,
        VotingRewardOrPenalty
    }

    uint8 public constant NUM_STATES = 5;

    uint16 public constant EPOCH_LENGTH = 300;

    // slither-disable-next-line too-many-digits
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;
    uint32 public constant BASE_DENOMINATOR = 10_000_000;
    // keccak256("BLOCK_CONFIRMER_ROLE")
    bytes32 public constant BLOCK_CONFIRMER_ROLE = 0x18797bc7973e1dadee1895be2f1003818e30eae3b0e7a01eb9b2e66f3ea2771f;

    // keccak256("STAKE_MODIFIER_ROLE")
    bytes32 public constant STAKE_MODIFIER_ROLE = 0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804;

    // keccak256("REWARD_MODIFIER_ROLE")
    bytes32 public constant REWARD_MODIFIER_ROLE = 0xcabcaf259dd9a27f23bd8a92bacd65983c2ebf027c853f89f941715905271a8d;

    // keccak256("COLLECTION_MODIFIER_ROLE")
    bytes32 public constant COLLECTION_MODIFIER_ROLE = 0xa3a75e7cd2b78fcc3ae2046ab93bfa4ac0b87ed7ea56646a312cbcb73eabd294;

    // keccak256("VOTE_MODIFIER_ROLE")
    bytes32 public constant VOTE_MODIFIER_ROLE = 0x912208965b92edeb3eb82a612c87b38b5e844f7539cb396f0d08ec012e511b07;

    // keccak256("DELEGATOR_MODIFIER_ROLE")
    bytes32 public constant DELEGATOR_MODIFIER_ROLE = 0x6b7da7a33355c6e035439beb2ac6a052f1558db73f08690b1c9ef5a4e8389597;

    // keccak256("REGISTRY_MODIFIER_ROLE")
    bytes32 public constant REGISTRY_MODIFIER_ROLE = 0xca51085219bef34771da292cb24ee4fcf0ae6bdba1a62c17d1fb7d58be802883;

    // keccak256("SECRETS_MODIFIER_ROLE")
    bytes32 public constant SECRETS_MODIFIER_ROLE = 0x46aaf8a125792dfff6db03d74f94fe1acaf55c8cab22f65297c15809c364465c;

    // keccak256("PAUSE_ROLE")
    bytes32 public constant PAUSE_ROLE = 0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d;

    // keccak256("GOVERNANCE_ROLE")
    bytes32 public constant GOVERNANCE_ROLE = 0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1;

    // keccak256("STOKEN_ROLE")
    bytes32 public constant STOKEN_ROLE = 0xce3e6c780f179d7a08d28e380f7be9c36d990f56515174f8adb6287c543e30dc;

    // keccak256("SALT_MODIFIER_ROLE")
    bytes32 public constant SALT_MODIFIER_ROLE = 0xf31dda80d37c96a1a0852ace387dda52a75487d7d4eb74895e749ede3e0987b4;

    // keccak256("DEPTH_MODIFIER_ROLE)")
    bytes32 public constant DEPTH_MODIFIER_ROLE = 0x91f5d9ea80c4d04985e669bc72870410b28b57afdf61c0d50d377766d86a3748;

    // keccak256("ESCAPE_HATCH_ROLE")
    bytes32 public constant ESCAPE_HATCH_ROLE = 0x518d8c39717318f051dfb836a4ebe5b3c34aa2cb7fce26c21a89745422ba8043;
}
