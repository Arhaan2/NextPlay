import { useEffect } from "react";

import { registerWebMcpTools } from "./registerTools";

/** Registers the five active page tools from the top-level React application. */
export function useWebMcpTools(): void {
  useEffect(() => {
    const registration = registerWebMcpTools();
    return registration.cleanup;
  }, []);
}
