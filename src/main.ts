import * as dotenv from 'dotenv'; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';
import Router from '@koa/router';
import { relayerSend } from 'src/routes/relayer/send';
import parseArgs from 'minimist';
import fs from 'fs';
import { createRelayerRouter } from 'src/relayer/RelayerRouter';
import { chainById } from '/src/chain/chain';
import { deployForwarderLocal } from '/src/deployLocal';
import { initConfig } from '/src/initConfig';

type GliderConfig = {
  port?: number;
  networks?: Array<{rpcUrl: string, accountPrivateKeys: Array<string>, forwarderAddress?: string}>;
}

// We deploy to a deterministic address by using your main account to fund a
// private address that will deterministically exist.

const main = async () => {
  const argv = parseArgs(process.argv.slice(2), { 'string': ['port', 'config'] });

  const configPath = argv['config'];
  let gliderConfig: GliderConfig = {};

  if (process.argv[2] === 'deploy_local') {
    await deployForwarderLocal(argv['port']);
    return;
  } else if (process.argv[2] === 'init_config') {
    initConfig();
    return;
  } else if (process.argv[2] !== 'start') {
    console.log('Usage: npx glider start [--config=<config_file.json>], npx glider deploy_local --port=<port>, or npx glider init_config');
    process.exit();
  }
  if (!configPath) {
    console.log('must specify config using --config=<config_file.json>. See documentation for how to format config file.');
    process.exit();
  }

  gliderConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (gliderConfig.port == null) {
    gliderConfig.port = 3001;
  }

  if (gliderConfig.networks == null || gliderConfig.networks.length == 0) {
    console.log('Must specify networks in glider config. See documentation.');
    process.exit();
  }

  // Initialize all relay routers for chains.
  const chainsList = await Promise.all(gliderConfig.networks.map(async ({ rpcUrl, forwarderAddress, accountPrivateKeys }) => {
    const relayerRouter = await createRelayerRouter(rpcUrl, accountPrivateKeys, forwarderAddress);
    return {
      rpcUrl,
      chainId: relayerRouter.chainId,
      relayerRouter,
    };
  }));
  chainsList.forEach((chain) => chainById.set(chain.chainId, chain));

  const app = new Koa();
  const router = new Router();

  app.use(cors({
    maxAge: 86400,
  }));
  app.use(bodyParser({ formLimit: '1mb', jsonLimit: '1mb', textLimit: '1mb' }));

  router.post('/relayer/send', relayerSend);
  app.use(router.routes());

  const port = gliderConfig.port;
  app.listen();

  console.log(`Running on port ${port}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
