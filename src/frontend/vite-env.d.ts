/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NEWRELIC_LICENSE_KEY: string;
  readonly VITE_NEWRELIC_APPLICATION_ID: string;
  readonly PROD: boolean;
  readonly DEV: boolean;
  readonly MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
