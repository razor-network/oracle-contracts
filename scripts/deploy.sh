#!/usr/bin/env bash

ENV=$1

# Exit immediately if a command exits with a non-zero status.
set -e

# Copy address from previous deployment, if it exists
if [[ -f "deployed/$ENV/addresses.json" ]]
then
    echo "Previous address"
    cat deployed/$ENV/addresses.json 
    cp deployed/$ENV/addresses.json .previous-deployment-addresses
    rm -rf deployed/$ENV
fi

npm run compile
npx hardhat run migrations/deploy_all.js --network $ENV

mkdir -p deployed/$ENV
cp -r artifacts deployed/$ENV/abi
cat .contract-deployment.tmp.json | jq '.' > deployed/$ENV/addresses.json
rm -rf .contract-deployment.tmp.json

echo "New Address"
cat deployed/$ENV/addresses.json
if [[ -f "./.previous-deployment-addresses" ]]
then
    rm -rf .previous-deployment-addresses
fi

echo "Done"
