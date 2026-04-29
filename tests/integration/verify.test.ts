import { describe, expect, it } from "vitest";
import { createCli } from "../../src/cli.js";
import { createVerifyCommand } from "../../src/commands/verify.js";

describe("verify command", () => {
  it("reports remaining unknown or risky areas as actionable findings", async () => {
    const cli = createCli({
      commands: {
        verify: createVerifyCommand([
          {
            id: "unmanaged-leftover",
            severity: "low",
            category: "unknown",
            path: "/target/unknown",
            message: "Unmanaged target content remains"
          }
        ])
      }
    });

    const result = await cli.run(["verify", "--json"]);

    expect(JSON.parse(result.stdout).findings).toEqual([
      expect.objectContaining({
        id: "unmanaged-leftover",
        path: "/target/unknown"
      })
    ]);
  });
});
