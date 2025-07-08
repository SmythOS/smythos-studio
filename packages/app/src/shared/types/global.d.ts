declare global {
  interface Window {
    __LLM_MODELS__: Record<string, any>;
  }
}

export { };
