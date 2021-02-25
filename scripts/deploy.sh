#!/usr/bin/env bash

ENV=$1

# Exit immediately if a command exits with a non-zero status.
set -e

rm -rf deployed/$ENV
cp .env.$ENV .env

npx hardhat run migrations/deploy_all.js --network $ENV

mkdir -p deployed/$ENV
cp -r artifacts deployed/$ENV/abi
cat .contract-deployment.tmp.json | jq '.' > deployed/$ENV/addresses.json
rm -rf .contract-deployment.tmp.json
