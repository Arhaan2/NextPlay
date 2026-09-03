export interface ModelContextJsonSchema {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
  description?: string;
  properties?: Record<string, ModelContextJsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: ModelContextJsonSchema;
  enum?: readonly (string | number)[];
  minimum?: number;
  exclusiveMinimum?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
}

export interface ModelContextToolAnnotations {
  readOnlyHint?: boolean;
}

export interface ModelContextExecuteOptions {
  signal?: AbortSignal;
}

export interface ModelContextToolDefinition {
  name: string;
  description: string;
  inputSchema: ModelContextJsonSchema;
  annotations?: ModelContextToolAnnotations;
  execute: (input: unknown, options?: ModelContextExecuteOptions) => unknown;
}

export interface ModelContextRegistrationOptions {
  signal: AbortSignal;
}

export interface ModelContext {
  registerTool: (
    tool: ModelContextToolDefinition,
    options: ModelContextRegistrationOptions,
  ) => Promise<void>;
}

declare global {
  interface Document {
    modelContext?: ModelContext;
  }
}

export {};
