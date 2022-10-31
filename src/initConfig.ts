import fs from 'fs';

export const initConfig = () => {
  if (fs.existsSync('.glider.json')) {
    console.log('Config file already exists. Aborting.');
    return;
  }
  fs.writeFileSync('.glider.json', JSON.stringify({
    port: 3001,
    networks: [
      {
        rpcUrl: 'http://localhost:8545',
        accountPrivateKeys: ['0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d']
      },
    ],
  }, null, 2));
};
