import { Command } from "./commands/Command";

export interface CommandFactory {
  buildCommand(input: any): Promise<Command>;
}
