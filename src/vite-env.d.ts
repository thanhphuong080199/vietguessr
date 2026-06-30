/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAPILLARY_TOKEN: string | undefined;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
