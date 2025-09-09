/**
 * Type definitions for Agent data structures and OpenAPI specs
 * These types ensure type safety across the OpenAPI generation system
 */

export interface AgentData {
  id?: string;
  name?: string;
  data?: {
    version?: string;
    behavior?: string;
    shortDescription?: string;
    description?: string;
    components?: Array<AgentComponent>;
  };
  settings?: { [key: string]: any };
  embodiments?: any[];
  deployed?: boolean;
}

interface AgentComponent {
  name: string;
  data: {
    endpoint?: string;
    method?: string;
    description?: string;
    doc?: string;
    ai_exposed?: boolean;
  };
  inputs?: Array<AgentInput>;
}

interface AgentInput {
  name: string;
  type: string;
  description?: string;
  optional?: boolean;
  defaultVal?: any;
}

export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{ url: string }>;
  paths: { [path: string]: any };
  components?: {
    schemas?: { [key: string]: any };
    securitySchemes?: { [key: string]: any };
  };
  security?: Array<{ [key: string]: string[] }>;
  [key: string]: any; // Allow additional OpenAPI properties
}
