#!/bin/sh

# turn on bash's job control
set -m
/usr/local/bin/hardhat_node.sh &

# Start the helper process

cd /usr/src/app;
/usr/local/bin/deploy.sh local
  
# the my_helper_process might need to know how to wait on the
# primary process to start before it does its work and returns
  
  
# now we bring the primary process back into the foreground
# and leave it there
fg %1