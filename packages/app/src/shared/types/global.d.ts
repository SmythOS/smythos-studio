declare global {
  interface Window {
    __LLM_MODELS__: Record<string, any>;
    SMYTHOS_EDITION: string;
  }
}

export { };
