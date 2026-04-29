import { createApplyCommand } from "./apply.js";
import type { CommandHandler } from "../types.js";

export function createBootstrapCommand(): CommandHandler {
  const apply = createApplyCommand();
  return (context, args) => apply(context, args);
}
