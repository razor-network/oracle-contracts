install truffle\
install openzeppelin\
`npm i openzeppelin-solidity`\
run ganache\
`ganache-cli -s 0 -i 420 -a 30`\
run test\
`truffle test test/Schelling.js `\
for bigSchelling.js large number of accounts required\
`ganache-cli -s 0 -i 420 -a 101`\
for testing with client, set blocktime\
`ganache-cli -s 0 -i 420 -a 30 -b 5`
deploy\
`truffle migrate --reset`
