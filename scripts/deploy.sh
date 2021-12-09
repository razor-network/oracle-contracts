#!/usr/bin/env bash

ENV=$1

# Exit immediately if a command exits with a non-zero status.
set -e

# Copy address from previous deployment, if it exists
if [[ -f "deployed/$ENV/addresses.json" ]]
then
    cp deployed/$ENV/addresses.json .previous-deployment-addresses
    rm -rf deployed/$ENV
fi

echo "Compiling....."
npx hardhat --config $ENV.hardhat.config.js compile

echo "Migrating....."
npx hardhat --config $ENV.hardhat.config.js run migrations/deploy_all.js --network $ENV 


mkdir -p deployed/$ENV
cp -r artifacts deployed/$ENV/abi
cat .contract-deployment.tmp.json | jq '.' > deployed/$ENV/addresses.json
rm -rf .contract-deployment.tmp.json

if [[ -f "./.previous-deployment-addresses" ]]
then
    rm -rf .previous-deployment-addresses
fi

echo "Done"