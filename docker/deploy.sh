#!/usr/bin/env bash

ENV=$1

# Exit immediately if a command exits with a non-zero status.
set -e

cd /usr/src/app;

# Copy address from previous deployment, if it exists
if [[ -f "deployed/$ENV/addresses.json" ]]
then
    cp deployed/$ENV/addresses.json .previous-deployment-addresses
    rm -rf deployed/$ENV
fi

if [[ -f .env.$ENV ]]
then
    cp .env.$ENV .env
fi

npm run compile
npx hardhat run migrations/deploy_all.js --network $ENV

mkdir -p deployed/$ENV
cp -r artifacts deployed/$ENV/abi
cat .contract-deployment.tmp.json | jq '.' > deployed/$ENV/addresses.json
rm -rf .contract-deployment.tmp.json

if [[ -f "./.previous-deployment-addresses" ]]
then
    rm -rf .previous-deployment-addresses
fi

echo "Done"
