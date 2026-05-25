/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Deprecated — do not use; OpenAI must be server-side (CHIMERA_OPENAI_API_KEY). */
  readonly VITE_OPENAI_API_KEY?: string;
  /** Production API origin, e.g. https://api.yourdomain.com */
  readonly VITE_CHIMERA_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
