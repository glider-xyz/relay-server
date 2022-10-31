import * as ethers from 'ethers';
import { entropyToMnemonic } from '@ethersproject/hdnode';
import { abi as ForwarderABI, bytecode as ForwarderBytecode } from 'src/contractArtifacts/ForwarderArtifact.json';
// We deploy to a deterministic address by using your main account to fund a
// private address that will deterministically exist.
export const deployForwarderLocal = async (port: number = 8545) => {
  const provider = new ethers.providers.JsonRpcProvider(`http://localhost:${port}`);
  const signer = provider.getSigner();

  // Create ethers.js wallet from mnemonic.
  let forwarderDeployerWallet: ethers.Signer = ethers.Wallet.fromMnemonic(entropyToMnemonic('0x' + Buffer.from('forwarder do_not_use').toString('hex'))).connect(provider);

  // Fund the forwarder deployer. If can't fund, deploy using signer.
  try {
    await signer.sendTransaction({
      to: await forwarderDeployerWallet.getAddress(),
      value: ethers.utils.parseEther('0.1'),
    });
  } catch (e) {
    forwarderDeployerWallet = signer;
    console.log('Could not fund a dummy wallet to deploy forwarder contract. This means that you must change the forwarder address in the .glider.json config file.');
  }

  const ForwarderFactory = new ethers.ContractFactory(ForwarderABI, ForwarderBytecode, forwarderDeployerWallet);
  const forwarder = await ForwarderFactory.deploy();
  await forwarder.deployed();
  console.log(`Forwarder deployed to ${forwarder.address}`);
};
