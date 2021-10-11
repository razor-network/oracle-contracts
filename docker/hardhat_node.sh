#!/bin/sh

cd /usr/src/app;

npx hardhat node;
# Keep node alive
set -e
if [ "${1#-}" != "${1}" ] || [ -z "$(command -v "${1}")" ]; then
  set -- node "$@"
fi

exec "$@"

