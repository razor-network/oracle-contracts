const { BigNumber } = ethers;

const DEFAULT_ADMIN_ROLE_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ONE_ETHER = BigNumber.from(10).pow(BigNumber.from(18));

const EPOCH_LENGTH = BigNumber.from(1200);
const BASE_DENOMINATOR = BigNumber.from(10000000);
const NUM_BLOCKS = 10;
const NUM_STATES = BigNumber.from(5);
const STATE_LENGTH = BigNumber.from(240);
const GRACE_PERIOD = 0;
const UNSTAKE_LOCK_PERIOD = 1;
const WITHDRAW_LOCK_PERIOD = 1;
const WITHDRAW_INITIATION_PERIOD = 5;
const MATURITIES = [50, 70, 86, 100, 111, 122, 132, 141, 150, 158,
  165, 173, 180, 187, 193, 200, 206, 212, 217, 223,
  229, 234, 239, 244, 250, 254, 259, 264, 269, 273,
  278, 282, 287, 291, 295, 300, 304, 308, 312, 316,
  320, 324, 327, 331, 335, 339, 342, 346, 350, 353,
  357, 360, 364, 367, 370, 374, 377, 380, 384, 387,
  390, 393, 396, 400, 403, 406, 409, 412, 415, 418,
  421, 424, 427, 430, 433, 435, 438, 441, 444, 447,
  450, 452, 455, 458, 460, 463, 466, 469, 471, 474,
  476, 479, 482, 484, 487, 489, 492, 494, 497];

// keccak256("BLOCK_CONFIRMER_ROLE")
const BLOCK_CONFIRMER_ROLE = '0x18797bc7973e1dadee1895be2f1003818e30eae3b0e7a01eb9b2e66f3ea2771f';

// keccak256("STAKE_MODIFIER_ROLE")
const STAKE_MODIFIER_ROLE = '0xdbaaaff2c3744aa215ebd99971829e1c1b728703a0bf252f96685d29011fc804';

// keccak256("REWARD_MODIFIER_ROLE")
const REWARD_MODIFIER_ROLE = '0xcabcaf259dd9a27f23bd8a92bacd65983c2ebf027c853f89f941715905271a8d';

// keccak256("COLLECTION_MODIFIER_ROLE")
const COLLECTION_MODIFIER_ROLE = '0xa3a75e7cd2b78fcc3ae2046ab93bfa4ac0b87ed7ea56646a312cbcb73eabd294';

// keccak256("VOTE_MODIFIER_ROLE")
const VOTE_MODIFIER_ROLE = '0x912208965b92edeb3eb82a612c87b38b5e844f7539cb396f0d08ec012e511b07';

// keccak256("DELEGATOR_MODIFIER_ROLE")
const DELEGATOR_MODIFIER_ROLE = '0x6b7da7a33355c6e035439beb2ac6a052f1558db73f08690b1c9ef5a4e8389597';

// keccak256("REGISTRY_MODIFIER_ROLE")
const REGISTRY_MODIFIER_ROLE = '0xca51085219bef34771da292cb24ee4fcf0ae6bdba1a62c17d1fb7d58be802883';

// keccak256("GOVERNER_ROLE")
const GOVERNER_ROLE = '0x704c992d358ec8f6051d88e5bd9f92457afedcbc3e2d110fcd019b5eda48e52e';

// keccak256("GOVERNANCE_ROLE")
const GOVERNANCE_ROLE = '0x71840dc4906352362b0cdaf79870196c8e42acafade72d5d5a6d59291253ceb1';

// keccak256("PAUSE_ROLE")
const PAUSE_ROLE = '0x139c2898040ef16910dc9f44dc697df79363da767d8bc92f2e310312b816e46d';

// keccak256("SALT_MODIFER_ROLE")
const SALT_MODIFIER_ROLE = '0xf31dda80d37c96a1a0852ace387dda52a75487d7d4eb74895e749ede3e0987b4';

// keccak256("SECRETS_MODIFIER_ROLE")
const SECRETS_MODIFIER_ROLE = '0x46aaf8a125792dfff6db03d74f94fe1acaf55c8cab22f65297c15809c364465c';

// keccak256("DEPTH_MODIFIER_ROLE")
const DEPTH_MODIFIER_ROLE = '0x91f5d9ea80c4d04985e669bc72870410b28b57afdf61c0d50d377766d86a3748';

const ESCAPE_HATCH_ROLE = '0x518d8c39717318f051dfb836a4ebe5b3c34aa2cb7fce26c21a89745422ba8043';

// keccak256("STOKEN_ROLE")
const STOKEN_ROLE = '0xce3e6c780f179d7a08d28e380f7be9c36d990f56515174f8adb6287c543e30dc';

// keccak256("OCCURRENCE_MODIFIER_ROLE")
const OCCURRENCE_MODIFIER_ROLE = '0x35ed6c1cb451e31b9dd4f1d325602da07694e1747843e6b55ab1527fd8835fb5';

// keccak256("RESET_DATABOND_ROLE")
const RESET_DATABOND_ROLE = '0x3e99a7fb3946972656cbde0e63ef530dd7750472272e07c65aa9f473a99f5c5d';

// keccak256("COLLECTION_CONFIRMER_ROLE")
const COLLECTION_CONFIRMER_ROLE = '0xa1d2ec18e7ea6241ef0566da3d2bc59cc059592990e56680abdc7031155a0c28';

const BURN_ADDRESS = '0x000000000000000000000000000000000000dEaD';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

module.exports = {
  DEFAULT_ADMIN_ROLE_HASH,
  BLOCK_CONFIRMER_ROLE,
  STAKE_MODIFIER_ROLE,
  SECRETS_MODIFIER_ROLE,
  REWARD_MODIFIER_ROLE,
  COLLECTION_MODIFIER_ROLE,
  VOTE_MODIFIER_ROLE,
  DELEGATOR_MODIFIER_ROLE,
  REGISTRY_MODIFIER_ROLE,
  GOVERNER_ROLE,
  SALT_MODIFIER_ROLE,
  DEPTH_MODIFIER_ROLE,
  BASE_DENOMINATOR,
  GOVERNANCE_ROLE,
  PAUSE_ROLE,
  EPOCH_LENGTH,
  NUM_BLOCKS,
  NUM_STATES,
  ONE_ETHER,
  STATE_LENGTH,
  GRACE_PERIOD,
  UNSTAKE_LOCK_PERIOD,
  WITHDRAW_LOCK_PERIOD,
  WITHDRAW_INITIATION_PERIOD,
  ESCAPE_HATCH_ROLE,
  OCCURRENCE_MODIFIER_ROLE,
  RESET_DATABOND_ROLE,
  COLLECTION_CONFIRMER_ROLE,
  MATURITIES,
  ZERO_ADDRESS,
  BURN_ADDRESS,
  STOKEN_ROLE,
};
