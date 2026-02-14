/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SAAS_SLUG: string;
  readonly VITE_API_URL: string;
  readonly VITE_PRODUCT_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
