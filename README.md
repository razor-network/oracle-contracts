# Razor network - Contracts

These are the contracts for Razor network.
## Prerequisites :
#### npm
You'll need npm to install the required packages.
To install npm , go to this [link](https://www.npmjs.com/get-npm)
#### Truffle 
With npm installed, we'll now install truffle.<br>
` npm install -g truffle `

For more info on truffle , check [this](https://www.trufflesuite.com/) out.
#### openzeppelin 
To install openzeppelin , paste the following in your terminal opened at project directory. <br>
`npm install openzeppelin-solidity `

For more info on openzeppelin , check [this](https://openzeppelin.com/contracts/) out.
#### Ganache 
Ganache is used for setting up a local Ethereum Blockchain for testing your Smart contracts.

To download and install the Ganache GUI, go [here](https://www.trufflesuite.com/ganache).<br>
To install the command line version of ganache <br>
`npm install ganache-cli`

# Deployment

First of all clone this repository using the following command.<br>
`git clone https://github.com/razor-network/contracts.git`

#### Local Deployment using ganache-cli
Paste this into your terminal to run ganache-cli :

`ganache-cli -s 0 -i 420 -a 30 -b 5 -l 7000000`

#### Local Deployment using ganache gui 
1. Open ganache gui.
2. Click on new-workspace.
3. Add truffle-config.js using 'Add Project'.
4. In Server settings change Port number to 8545 and Network ID to 420.
5. In Accounts & Keys settings, change Total Accounts to generate to 30.
6. In Chain settings, change Gas Limit to 7000000.
7. Click on Save Workspace.

Having started a local blockchain using ganache (cli/gui), we now need to deploy our contracts locally. 
Use `truffle migrate --reset` .

#### Deployment on rinkeby testnet
1.Register at [infura](https://infura.io/).<br>
2.Create a new project, change the endpoint to Rinkeby and copy the URL of the endpoint for Rinkeby.<br>
3.Install HDWalletProvider.<br>`npm install @truffle/hdwallet-provider`<br>
4.Create 'mnemonic.txt' and place the mnemonic used to generate your account (Found in metamask) in it.<br>
5.Create 'infura.txt' and place the project ID in it.<br>
6.Paste your account address in truffle-config.js in the rinkeby object at 'from' property.<br>
7.Run `truffle migrate --network rinkeby`<br>

#### Deployment on goerli testnet 
Same as above. Run `truffle migrate --network goerli` <br>

#### Running tests

Use `truffle test`.

#### Test Coverage 

Run the following commands:<br>
`npm install --save-dev solidity-coverage`<br/>
`npm run coverage`

# Addresses
Contract addresses can be found [here](ADDRESSES.md)

