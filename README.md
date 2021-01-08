# Razor network - Contracts

These are the contracts for Razor network.
# Deployment

1. Install truffle
2. Install openzeppelin
`npm i openzeppelin-solidity`
3. Run ganache-cli
`ganache-cli -s 0 -i 420 -a 30 -l 7000000`
4. Run tests
`truffle test`
5. For bigSchelling.js large number of accounts are required
`ganache-cli -s 0 -i 420 -a 101 -l 7000000`
6. For testing with cli, set blocktime
`ganache-cli -s 0 -i 420 -a 30 -b 5 -l 7000000`
7. Deploy on ganache
`truffle migrate --reset`
8. create .secret file with mnemonic of the private key used to deploy on rinkeby
9. Deploy on görli (.secret file must be present with mnemonic of the private key used to deploy)
`truffle migrate --network goerli --reset`
10. For test coverage,<br/> 
   `npm install --save-dev solidity-coverage`<br/>
   `npm run coverage` 

# Migration guide
1. `truffle migrate --reset --network goerli`
2. `sh copy-build.sh`
3. `cd ../cli && git add . && git commit -m 'redeploy' && git push`
4. `cd ../synthetic-assets`
5. Change the delegator address in `synthetic-assets/migrations/2_deploy.js`
6. `truffle migrate --reset --network goerli`
7. `git add . && git commit -m 'redeploy' && git push`
8. `cd ../dashboard`
9. `git add . && git commit -m 'redeploy' && git push`
6. In remote server:
   1. `cd cli && git pull`
   2. `pm2 stop all`
   3. Run first 5 lines in file cli/misc/deploy.sh for stakers to stake
   4. `pm2 start all` once staked



# Addresses
Contract addresses can be found [here](ADDRESSES.md)

