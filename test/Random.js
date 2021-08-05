const { assert } = require('chai');

const { setupContracts } = require('./helpers/testSetup');
const {
  prng,
  prngHash,
  toBigNumber,
} = require('./helpers/utils');

describe('Random Test', async () => {
  let random;

  before(async () => {
    ({ random } = await setupContracts());
  });

  it('prng should return correct value', async () => {
    const hash = '0x72f00ac4a53922e6e3f2a509ae59cd1f5274eab64aba934160551d42c41f8a44';
    const max = toBigNumber(2000);
    const rand1 = await random.prng(max, hash);
    const rand2 = await prng(max, hash);
    assert(rand1.eq(rand2), 'Random number doesnt match');
  });

  it('prngHash should return correct value', async () => {
    const seed = '0x01a2d41ff9cbe4611e95213d9af80b5d2676641cb1957269b57ee18d3142dfbb';
    const salt = '0x5a07b28f97c839c5550999862f9e7c34614e542da6019bbc878c5e4fcacaa4c0';
    const prngHash1 = await random.prngHash(seed, salt);
    const prngHash2 = await prngHash(seed, salt);
    assert(prngHash1 === prngHash2, 'Random number doesnt match');
  });
});
