import { BigNumber, ethers } from 'ethers';
import { TransactionResponse } from '@ethersproject/abstract-provider';
import { chainIdToMetadata } from '/src/chain/chain';

enum RelayerStatus {
  IDLE = 'IDLE',
  BUSY = 'BUSY',
}

export const createRelayer = async (signer: ethers.Signer, provider: ethers.providers.Provider, chainId: number) => {
  const [
    balance,
    address,
  ] = await Promise.all([
    signer.getBalance(),
    signer.getAddress(),
  ]);
  return new Relayer(chainId, provider, signer, address, balance);
};

class Relayer {
  address: string;
  signer: ethers.Signer;
  provider: ethers.providers.Provider;
  balance: BigNumber;
  chainId: number;
  status: RelayerStatus;
  currentTransaction: TransactionResponse | null;

  constructor(
    chainId: number,
    provider: ethers.providers.Provider,
    signer: ethers.Signer,
    address: string,
    balance: BigNumber,
  ) {
    this.chainId = chainId;
    this.provider = provider;
    this.signer = signer;
    this.address = address;
    this.balance = balance;
    this.status = RelayerStatus.IDLE;
    this.currentTransaction = null;
  }

  private __setToIdle() {
    this.currentTransaction = null;
    this.status = RelayerStatus.IDLE;
  }

  private __getEIP1559GasParams = async (): Promise<{maxFeePerGas: BigNumber, maxPriorityFeePerGas: BigNumber}> => {
    const { maxFeePerGas, maxPriorityFeePerGas } = await this.provider.getFeeData();
    if (maxFeePerGas === null || maxPriorityFeePerGas === null) {
      throw Error('Could not estimate fee data');
    }
    return {
      maxFeePerGas,
      maxPriorityFeePerGas,
    };
  };

  // Value is always zero
  async send(to: string, data: string): Promise<TransactionResponse> {
    this.status = RelayerStatus.BUSY;

    const {
      maxFeePerGas,
      maxPriorityFeePerGas,
    } = await this.__getEIP1559GasParams();

    // sendTransaction
    try {
      this.currentTransaction = await this.signer.sendTransaction({
        to,
        data,
        value: BigNumber.from(0),
        maxFeePerGas,
        maxPriorityFeePerGas,
      });
    } catch (e) {
      this.__setToIdle();
      throw e;
    }

    const confirmations = chainIdToMetadata(this.chainId).confirmations;
    this.currentTransaction.wait(confirmations).then(() => {
      this.__setToIdle();
    });

    return this.currentTransaction;
  }
}

export { Relayer, RelayerStatus };
