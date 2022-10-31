export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ALCHEMY_API_KEY: string;

      OWLRACLE_API_KEY: string;
      OWLRACLE_API_SECRET: string;

      FORWARDER_ADDRESS: string;
    }
  }
}
