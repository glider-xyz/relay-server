import * as ethers from 'ethers';

import { verifyJwt } from '/src/lib/auth';
import { createTransactionFromForwardRequest, ForwardRequest } from '../../lib/transaction';
import { Context } from 'koa';
import { chainById, chainIdToMetadata } from '/src/chain/chain';

export type API_relayerSendRequest = {
  forwardRequest: ForwardRequest;
  chainId: number;
  signature: string;
};

export type API_relayerSendResponse = {
  hash: string;
  from: string;
  confirmations: number;
};

// Does not actually do business logic right now.
// We just always relay.
export const relayerSend = async (
  ctx: Context,
) => {
  console.log('relayerSend called');
  const { forwardRequest, signature, chainId } = <API_relayerSendRequest>ctx.request.body;

  if (!signature) {
    ctx.status = 400;
    ctx.message = 'Missing signature.';
    return;
  }
  if (!chainId) {
    ctx.status = 400;
    ctx.message = 'Missing chain id.';
    return;
  }
  if (!forwardRequest) {
    ctx.status = 400;
    ctx.message = 'Missing forwardRequest.'; console.debug('no transactionBase');
    return;
  }

  const chain = chainById.get(chainId);
  if (chain == null) {
    ctx.status = 400;
    ctx.message = 'Invalid chain id';
    return;
  }

  const txn = await createTransactionFromForwardRequest(chain, forwardRequest, signature);
  if (txn == null) {
    ctx.status = 400;
    ctx.message = 'Invalid signature';
    return;
  }

  // Check authenticity of API key if not on local chain.
  if (!chainIdToMetadata(chainId).isLocalChain) {
    const apiKey = ctx.get('x-api-key');
    if (!apiKey) {
      ctx.status = 401;
      ctx.message = 'Missing API key.';
      return;
    }
    if (!(verifyJwt(apiKey, process.env.JWT_SECRET!))) {
      ctx.status = 401;
      ctx.message = 'Invalid API key.';
      return;
    }
  }

  try {
    const res = await chain.relayerRouter.send(chain.relayerRouter.forwarderAddress, txn.data!);
    ctx.status = 200;
    ctx.body = <API_relayerSendResponse>{
      hash: res.hash,
      from: res.from,
      confirmations: res.confirmations,
    };
    return;
  } catch (e: any) {
    if (e.code === ethers.errors.INSUFFICIENT_FUNDS) {
      ctx.status = 400;
      ctx.message = 'Insufficient funds in your wallet.';
      return;
    }
    if (e.message === 'No relayers available') {
      ctx.status = 503;
      ctx.message = 'No relayers available. Please retry.';
    }
    ctx.status = 500;
    ctx.message = 'Call failed for an unknown reason.';
    return;
  }
};
