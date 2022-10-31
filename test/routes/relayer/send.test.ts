/* eslint no-undef: "off" */
import { createMockContext } from '@shopify/jest-koa-mocks';
import { relayerSend } from '../../../src/routes/relayer/send';
import { Chain, chainById } from '../../../src/chain/chain';
import { RelayerRouter } from '../../../src/relayer/RelayerRouter';
import { createRelayer, Relayer } from '../../../src/relayer/Relayer';
import * as ethers from 'ethers';
import { ForwardRequest } from '../../../src/lib/transaction';

jest.mock('../../../src//lib/transaction', () => ({
  createTransactionFromForwardRequest: jest.fn((_chain: Chain, _forwardRequest: ForwardRequest, signature: string) => {
    return signature === 'valid_signature' ? {} as ethers.ethers.PopulatedTransaction : null;
  }),
}));

jest.mock('../../../src/lib/auth', () => ({
  verifyJwt: jest.fn((key: string) => {return key === 'valid_key';}),
}));

// TODO: figure out a better way to mock providers and signers.
const mockInit = async () => {
  const relayer = await createRelayer({ getBalance: () => ethers.BigNumber.from('1234'), getAddress: () => '0x1234' } as unknown as ethers.Signer, {} as ethers.providers.Provider, 12345);
  const relayers: Array<Relayer> = [relayer];
  chainById.set(12345, {
    rpcUrl: 'fake_rpc_url',
    relayerRouter: {
      ...new RelayerRouter(relayers, 'fake_forwarder_address'),
      send: jest.fn().mockReturnValue({ hash: 'fake_hash' }),
      getAvailableRelayer: jest.fn().mockReturnValue(relayer),
    },
    chainId: 12345,
  });
  chainById.set(1337, {
    rpcUrl: 'fake_rpc_url_2',
    relayerRouter: {
      ...new RelayerRouter(relayers, 'fake_forwarder_address'),
      send: jest.fn().mockReturnValue({ hash: 'fake_hash' }),
      getAvailableRelayer: jest.fn().mockReturnValue(relayer),
    },
    chainId: 1337,
  });
};

describe('400 errors', () => {
  beforeEach(async () => {
    await mockInit();
  });

  it('400s on missing signature', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: '',
      chainId: 1,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'valid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.status).toBe(400);
    expect(ctx.message).toBe('Missing signature.');
  });

  it('Missing chain id returns 400', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: 'valid_signature',
      chainId: null,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'valid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.status).toBe(400);
    expect(ctx.message).toBe('Missing chain id.');
  });

  it('Missing forwardRequest returns 400', async () => {
    const request = {
      forwardRequest: null,
      signature: 'valid_signature',
      chainId: 1,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'valid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.status).toBe(400);
    expect(ctx.message).toBe('Missing forwardRequest.');
  });

  it('Invalid chain id returns 400', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: 'valid_signature',
      chainId: 9999,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'valid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.message).toBe('Invalid chain id');
    expect(ctx.status).toBe(400);
  });

  it('Missing forwardRequest returns 400', async () => {
    const request = {
      // forwardRequest: {
      //   from: '0x0000',
      //   to: '0x0000000000000000000000000000000000000000',
      //   value: '0',
      //   data: '0x',
      //   gas: '0',
      //   nonce: '0',
      // },
      signature: 'valid_signature',
      chainId: 12345,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'valid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.message).toBe('Missing forwardRequest.');
    expect(ctx.status).toBe(400);
  });

  it('Invalid signature returns 400', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: 'invalid_signature',
      chainId: 12345,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'valid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.message).toBe('Invalid signature');
    expect(ctx.status).toBe(400);
  });
});

describe('401 errors', () => {
  beforeEach(async () => {
    await mockInit();
  });

  it('Missing API key returns 401', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: 'valid_signature',
      chainId: 12345,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': '' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.message).toBe('Missing API key.');
    expect(ctx.status).toBe(401);
  });

  it('Invalid API key returns 401', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: 'valid_signature',
      chainId: 12345,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'invalid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.message).toBe('Invalid API key.');
    expect(ctx.status).toBe(401);
  });
});

describe('200 returns', () => {
  beforeEach(async () => {
    await mockInit();
  });

  it('should return 200', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: 'valid_signature',
      chainId: 12345,
    };
    const ctx = createMockContext({ headers: { 'x-api-key': 'valid_key' }, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.status).toBe(200);
  });

  it('should return 200 if chain is local (1337) and no api key', async () => {
    const request = {
      forwardRequest: {
        from: '0x0000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        data: '0x',
        gas: '0',
        nonce: '0',
      },
      signature: 'valid_signature',
      chainId: 1337,
    };
    const ctx = createMockContext({ headers: {}, requestBody: request });
    await relayerSend(ctx);
    expect(ctx.status).toBe(200);
  });
});
