import * as ethers from 'ethers';
import { abi as ForwarderABI, bytecode as ForwarderBytecode } from '/src/contractArtifacts/ForwarderArtifact.json';
import { Chain } from '/src/chain/chain';

export type ForwardRequest = {
  from: string;
  to: string;
  value: string;
  data: string;
  gas: string;
  nonce: string;
};

export const createTransactionFromForwardRequest = async (chain: Chain, forwardRequest: ForwardRequest, signature: string) => {
  const forwarder = new ethers.ContractFactory(ForwarderABI, ForwarderBytecode).attach(chain.relayerRouter.forwarderAddress);
  const txn = await forwarder.populateTransaction.execute(forwardRequest, signature);
  // Verify that the signature is correct.
  const provider = ethers.getDefaultProvider(chain.rpcUrl);
  const verified = await forwarder.connect(provider).verify(forwardRequest, signature);
  if (!verified) {
    return null;
  }
  return txn;
};
