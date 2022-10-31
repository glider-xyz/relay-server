import { createRelayer, Relayer, RelayerStatus } from '../../src/relayer/Relayer';
import * as ethers from 'ethers';
import { chainIdToMetadata } from '/src/chain/chain';

export const createRelayerRouter = async (rpcUrl: string, accountPrivateKeys: Array<string>, forwarderAddress?: string) => {
  const provider = ethers.getDefaultProvider(rpcUrl);
  if (accountPrivateKeys == null || accountPrivateKeys.length == 0) {
    throw new Error(`Could not find accountPrivateKeys for ${rpcUrl}. You must specify accountPrivateKeys to set the funder wallets.`);
  }
  const signers = await Promise.all(accountPrivateKeys.map((privateKey) => new ethers.Wallet(privateKey).connect(provider)));
  const chainId = (await provider.getNetwork()).chainId;
  const relayers = await Promise.all(signers.map((signer) => createRelayer(signer, provider, chainId)));
  const forwarderAddr = forwarderAddress ?? chainIdToMetadata(chainId).forwarderAddress;
  if (forwarderAddr == null) {
    throw new Error(`Could not find forwarder address for ${chainId}. This could be because the chain for ${chainId} is not supported by Glider, or because you did not specify the forwarder address in the config file for a local node.`);
  }
  return new RelayerRouter(relayers, forwarderAddr);
};

export class RelayerRouter {
  relayers: Relayer[];
  chainId: number;
  forwarderAddress: string;

  constructor(relayers: Relayer[], forwarderAddress: string) {
    this.relayers = relayers;
    this.chainId = relayers[0].chainId;
    this.forwarderAddress = forwarderAddress;
  }

  getAvailableRelayer(): Relayer | null {
    for (let i = 0; i < this.relayers.length; i++) {
      if (this.relayers[i].status === RelayerStatus.IDLE) {
        this.relayers[i].status = RelayerStatus.BUSY;
        return this.relayers[i];
      }
    }
    return null;
  }

  async send(to: string, data: string) {
    const availableRelayer = this.getAvailableRelayer();
    if (!availableRelayer) {
      throw new Error('No relayers available');
    }
    return await availableRelayer.send(to, data);
  }
}
