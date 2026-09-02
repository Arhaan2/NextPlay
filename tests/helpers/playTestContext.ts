import { createPlayCommands } from "../../src/application/commands";
import type { CommandDependencies } from "../../src/application/transaction";
import { createPlayStore } from "../../src/state/playStore";

export function createPlayTestContext() {
  const dependencies: CommandDependencies = {
    now: () => 1_700_000_000_000,
    createActivityId: (sequence) => `test-activity-${sequence}`,
  };
  const store = createPlayStore();

  return {
    commands: createPlayCommands(store, dependencies),
    dependencies,
    store,
  };
}
