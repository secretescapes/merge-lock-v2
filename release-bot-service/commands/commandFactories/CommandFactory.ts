import { Command } from "../Command";

export interface CommandFactory {
  buildCommand(input: any): Promise<Command>;
}
