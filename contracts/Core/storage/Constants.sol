// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

contract Constants {
    enum State {
        Commit,
        Reveal,
        Propose,
        Dispute,
        Confirm
    }
    uint8 public constant NUM_STATES = 5;

    // keccak256("BLOCK_CONFIRMER_ROLE")
    bytes32 public constant BLOCK_CONFIRMER_ROLE = 0x18797bc7973e1dadee1895be2f1003818e30eae3b0e7a01eb9b2e66f3ea2771f;

    // keccak256("ASSET_CONFIRMER_ROLE")
    bytes32 public constant ASSET_CONFIRMER_ROLE = 0xed202a1bc048f9b31cb3937bc52e7c8fe76413f0674b9146ff4bcc15612ccbc2;

    // keccak256("STAKER_ACTIVITY_UPDATER_ROLE")
    bytes32 public constant STAKER_ACTIVITY_UPDATER_ROLE = 0x4cd3070aaa07d03ab33731cbabd0cb27eb9e074a9430ad006c96941d71b77ece;

    // keccak256("STAKE_MODIFIER_ROLE")
    bytes32 public constant STAKE_MODIFIER_ROLE = 0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804;

    // keccak256("REWARD_MODIFIER_ROLE")
    bytes32 public constant REWARD_MODIFIER_ROLE = 0xcabcaf259dd9a27f23bd8a92bacd65983c2ebf027c853f89f941715905271a8d;

    // keccak256("ASSET_MODIFIER_ROLE")
    bytes32 public constant ASSET_MODIFIER_ROLE = 0xca0fffcc0404933256f3ec63d47233fbb05be25fc0eacc2cfb1a2853993fbbe4;

    // keccak256("VOTE_MODIFIER_ROLE")
    bytes32 public constant VOTE_MODIFIER_ROLE = 0xca0fffcc0404933256f3ec63d47233fbb05be25fc0eacc2cfb1a2853993fbbe5;

    // keccak256("SECRETS_MODIFIER_ROLE")
    bytes32 public constant SECRETS_MODIFIER_ROLE = 0x46aaf8a125792dfff6db03d74f94fe1acaf55c8cab22f65297c15809c364465c;

    address public constant BURN_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
