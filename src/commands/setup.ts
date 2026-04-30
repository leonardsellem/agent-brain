import { isScannableFsPort } from "../core/fs-port.js";
import { createSetupDiscovery } from "../setup/discovery.js";
import type { CommandHandler } from "../types.js";

export function createSetupCommand(): CommandHandler {
  return (context) => {
    const discovery = isScannableFsPort(context.fs) ? createSetupDiscovery(context.fs) : undefined;

    return {
      ok: true,
      summary: discovery
        ? `Setup found ${discovery.visibleRoots.length} visible roots, ${discovery.sources.length} sources, and ${discovery.symlinks.length} symlinks. Confirmation required before writing.`
        : "Setup is ready to discover sources and needs confirmation before writing.",
      findings: [
        {
          id: "setup.confirmation-required",
          severity: "info",
          category: "setup",
          message: "Guided setup is waiting at a confirmation boundary.",
          recommendation:
            "Review setup discovery before importing into an Agent Brain repo or mutating any live app root."
        },
        ...(discovery
          ? [
              {
                id: "setup.discovery",
                severity: "info" as const,
                category: "setup",
                message: "Read-only setup discovery completed.",
                provenance: {
                  visibleRoots: discovery.visibleRoots,
                  sources: discovery.sources,
                  symlinks: discovery.symlinks,
                  adapterTargets: discovery.adapterTargets
                }
              }
            ]
          : [])
      ]
    };
  };
}
