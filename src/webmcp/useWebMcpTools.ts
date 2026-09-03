import { useEffect } from "react";

import { registerWebMcpTools } from "./registerTools";

/** Registers the two Phase 3 page tools from the top-level React application. */
export function useWebMcpTools(): void {
  useEffect(() => {
    const registration = registerWebMcpTools();
    return registration.cleanup;
  }, []);
}
