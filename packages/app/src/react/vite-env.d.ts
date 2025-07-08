/// <reference types="vite/client" />

// Type declarations for assets and common imports
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// Remove overly broad wildcard declarations that interfere with import resolution
// Path mapping is properly configured in tsconfig.json and vite.config.ts
