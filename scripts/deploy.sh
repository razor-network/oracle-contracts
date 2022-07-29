#!/usr/bin/env bash
export $(grep -v -e '^#'  -e '^MNEMONIC' .env | xargs -0)
# Exit immediately if a command exits with a non-zero status.
set -e
echo "Starting deployment for $ENV environment"
# Copy address from previous deployment, if it exists
if [[ -f "deployed/$ENV/addresses.json" ]]
then
    echo "Previous addresses"
    cat deployed/$ENV/addresses.json
    cp deployed/$ENV/addresses.json .previous-deployment-addresses
    rm -rf deployed/$ENV
fi

echo "Deploying contracts on network $NETWORK"
npx hardhat --network $NETWORK deploy --show-stack-traces 
npx hardhat run migrations/postDeployment.js --network $NETWORK --show-stack-traces 

mkdir -p deployed/$ENV
cp -r artifacts deployed/$ENV/abi
cat .contract-deployment.tmp.json | jq '.' > deployed/$ENV/addresses.json
rm -rf .contract-deployment.tmp.json

if [[ -f "./.previous-deployment-addresses" ]]
then
    rm -rf .previous-deployment-addresses
fi

echo "Done"
