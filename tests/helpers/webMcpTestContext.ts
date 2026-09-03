import type {
  ModelContext,
  ModelContextRegistrationOptions,
  ModelContextToolDefinition,
} from "../../src/webmcp/modelContext";

export interface RegisteredTool {
  definition: ModelContextToolDefinition;
  options: ModelContextRegistrationOptions;
}

export interface FakeModelContext extends ModelContext {
  readonly registrations: RegisteredTool[];
}

export function createFakeModelContext(
  register?: (tool: ModelContextToolDefinition, options: ModelContextRegistrationOptions) => Promise<void>,
): FakeModelContext {
  const registrations: RegisteredTool[] = [];
  return {
    registrations,
    registerTool: (tool, options) => {
      registrations.push({ definition: tool, options });
      return register?.(tool, options) ?? Promise.resolve();
    },
  };
}

export function toolByName(
  context: FakeModelContext,
  name: string,
): ModelContextToolDefinition {
  const tool = context.registrations.find((registration) => registration.definition.name === name)?.definition;
  if (tool === undefined) {
    throw new Error(`Expected ${name} to be registered.`);
  }
  return tool;
}
