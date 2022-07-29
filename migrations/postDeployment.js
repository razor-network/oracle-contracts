/* eslint-disable no-console */
const postDeploymentSetup = require('./src/postDeploymentSetup');

async function main() {
  await postDeploymentSetup();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
