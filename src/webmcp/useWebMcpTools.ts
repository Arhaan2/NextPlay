import { useEffect } from "react";

import { registerWebMcpTools } from "./registerTools";

/** Registers the four active Phase 4 page tools from the top-level React application. */
export function useWebMcpTools(): void {
  useEffect(() => {
    const registration = registerWebMcpTools();
    return registration.cleanup;
  }, []);
}
