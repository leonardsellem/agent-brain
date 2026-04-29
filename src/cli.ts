#!/usr/bin/env node
import { renderJsonReport } from "./reporting/json.js";
import { renderTextReport } from "./reporting/text.js";
import { loadScannableFixture, ScannableFixtureError } from "./core/scannable-fixture.js";
import { createLiveScannableFsPort } from "./import/live-scanner.js";
import type { CommandContext, CommandHandler, FsPort, Report } from "./types.js";
import { createApplyCommand } from "./commands/apply.js";
import { createBootstrapCommand } from "./commands/bootstrap.js";
import { createDoctorCommand } from "./commands/doctor.js";
import { createExplainConflictCommand } from "./commands/explain-conflict.js";
import { createImportCommand, createPlanCommand } from "./commands/import.js";
import { createRollbackCommand } from "./commands/rollback.js";
import { createVerifyCommand } from "./commands/verify.js";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CliOptions {
  commands?: Partial<Record<CommandName, CommandHandler>>;
  fs?: FsPort;
}

type CommandName =
  | "doctor"
  | "import"
  | "plan"
  | "apply"
  | "bootstrap"
  | "verify"
  | "rollback"
  | "explain-conflict";

const commandPurposes: Record<CommandName, string> = {
  doctor: "Diagnose local agent app roots and ownership risks.",
  import: "Import portable source into an Agent Brain repo plan.",
  plan: "Show proposed adoption or apply changes before writing.",
  apply: "Apply approved Agent Brain materialization into target app roots.",
  bootstrap: "Bootstrap a target app root from an Agent Brain repo.",
  verify: "Verify generated target state and remaining risks.",
  rollback: "Restore a target root from a baseline snapshot.",
  "explain-conflict": "Explain conflicts using Agent Brain ownership terms."
};

const commandNames = Object.keys(commandPurposes) as CommandName[];

export function createCli(options: CliOptions = {}) {
  const fs = options.fs ?? { root: "/" };
  const commands = { ...defaultCommands(), ...options.commands };

  return {
    async run(argv: string[]): Promise<CliResult> {
      const [rawCommand, ...args] = argv;
      const wantsJson = args.includes("--json");

      if (!rawCommand || rawCommand === "--help" || rawCommand === "-h") {
        return {
          exitCode: 0,
          stdout: renderGeneralHelp(),
          stderr: ""
        };
      }

      if (!isCommandName(rawCommand)) {
        return {
          exitCode: 1,
          stdout: "",
          stderr: `Unknown command "${rawCommand}". Try one of: ${commandNames.join(", ")}\n`
        };
      }

      if (args.includes("--help") || args.includes("-h")) {
        return {
          exitCode: 0,
          stdout: renderCommandHelp(rawCommand),
          stderr: ""
        };
      }

      const parseError = validateArgs(args);
      if (parseError) {
        const report: Report = {
          ok: false,
          error: parseError,
          findings: []
        };

        return {
          exitCode: 1,
          stdout: wantsJson ? renderJsonReport(report) : "",
          stderr: wantsJson ? "" : renderTextReport(report)
        };
      }

      const fixturePath = optionValue(args, "--fixture");
      const commandFs = fixturePath
        ? loadFixtureForCli(fixturePath)
        : loadLiveRootsForCli(args) ?? { fs };
      if ("error" in commandFs) {
        const report: Report = {
          ok: false,
          error: commandFs.error,
          findings: []
        };

        return {
          exitCode: 1,
          stdout: wantsJson ? renderJsonReport(report) : "",
          stderr: wantsJson ? "" : renderTextReport(report)
        };
      }

      const context: CommandContext = { fs: commandFs.fs };
      const report = await commands[rawCommand](context, stripLiveOptions(stripOption(args, "--fixture")));
      const stdout = wantsJson ? renderJsonReport(report) : renderTextReport(report);

      return {
        exitCode: report.ok ? 0 : 1,
        stdout,
        stderr: ""
      };
    }
  };
}

function defaultCommands(): Record<CommandName, CommandHandler> {
  return {
    doctor: createDoctorCommand(),
    import: createImportCommand(),
    plan: createPlanCommand(),
    apply: createApplyCommand(),
    bootstrap: createBootstrapCommand(),
    verify: createVerifyCommand(),
    rollback: createRollbackCommand(),
    "explain-conflict": createExplainConflictCommand()
  };
}

function renderGeneralHelp(): string {
  return [
    "agent-brain <command>",
    "",
    ...commandNames.map((name) => `  ${name.padEnd(16)} ${commandPurposes[name]}`)
  ].join("\n") + "\n";
}

function renderCommandHelp(command: CommandName): string {
  return `agent-brain ${command}\n\n${commandPurposes[command]}\n`;
}

function isCommandName(value: string): value is CommandName {
  return commandNames.includes(value as CommandName);
}

function validateArgs(args: string[]) {
  const optionsRequiringValue = new Set([
    "--target-root",
    "--repo",
    "--snapshot",
    "--fixture",
    "--confirm-fingerprint",
    "--claude-root",
    "--codex-root",
    "--source-root",
    "--adapter",
    "--profile"
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!optionsRequiringValue.has(arg)) {
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return {
        code: "invalid_arguments",
        message: `Missing value for ${arg}`
      };
    }
    index += 1;
  }

  return undefined;
}

function optionValue(args: string[], option: string): string | undefined {
  const optionIndex = args.indexOf(option);
  return optionIndex === -1 ? undefined : args[optionIndex + 1];
}

function optionValues(args: string[], option: string): string[] {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === option && args[index + 1]) {
      values.push(args[index + 1]!);
      index += 1;
    }
  }
  return values;
}

function stripOption(args: string[], option: string): string[] {
  const stripped: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === option) {
      index += 1;
      continue;
    }
    stripped.push(args[index]!);
  }
  return stripped;
}

function stripLiveOptions(args: string[]): string[] {
  return ["--claude-root", "--codex-root", "--source-root"].reduce(
    (currentArgs, option) => stripOption(currentArgs, option),
    args
  );
}

function loadLiveRootsForCli(args: string[]): { fs: FsPort } | undefined {
  const claudeRoots = optionValues(args, "--claude-root");
  const codexRoots = optionValues(args, "--codex-root");
  const sourceRoots = optionValues(args, "--source-root");

  if (claudeRoots.length === 0 && codexRoots.length === 0 && sourceRoots.length === 0) {
    return undefined;
  }

  return {
    fs: createLiveScannableFsPort({
      claudeRoots,
      codexRoots,
      sourceRoots
    })
  };
}

function loadFixtureForCli(fixturePath: string):
  | { fs: FsPort }
  | {
      error: {
        code: "invalid_fixture";
        message: string;
      };
    } {
  try {
    return { fs: loadScannableFixture(fixturePath) };
  } catch (error) {
    return {
      error: {
        code: "invalid_fixture",
        message: error instanceof ScannableFixtureError ? error.message : "Invalid scannable fixture"
      }
    };
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await createCli().run(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
