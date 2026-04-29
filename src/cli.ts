#!/usr/bin/env node
import { renderJsonReport } from "./reporting/json.js";
import { renderTextReport } from "./reporting/text.js";
import type { CommandContext, CommandHandler, FsPort, Report } from "./types.js";

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
  | "verify"
  | "rollback"
  | "explain-conflict";

const commandPurposes: Record<CommandName, string> = {
  doctor: "Diagnose local agent app roots and ownership risks.",
  import: "Import portable source into an Agent Brain repo plan.",
  plan: "Show proposed adoption or apply changes before writing.",
  apply: "Apply approved Agent Brain materialization into target app roots.",
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

      const context: CommandContext = { fs };
      const report = await commands[rawCommand](context, args);
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
  const commands = {} as Record<CommandName, CommandHandler>;
  for (const name of commandNames) {
    commands[name] = () => ({
      ok: true,
      summary: `${name}: ${commandPurposes[name]}`,
      findings: []
    });
  }
  return commands;
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
  const optionsRequiringValue = new Set(["--target-root", "--repo", "--snapshot"]);

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

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = await createCli().run(process.argv.slice(2));
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.exitCode;
}
