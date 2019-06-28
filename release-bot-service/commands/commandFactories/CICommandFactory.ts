import { CommandFactory } from "./CommandFactory";
import { Command } from "../Command";
import { CIQueueChangedCommand } from "../CICommands/CIQueueChangedCommand";

export class CICommandFactory implements CommandFactory {
  async buildCommand(input: any): Promise<Command> {
    switch (input.eventType) {
      case "QUEUE_CHANGED":
        return new CIQueueChangedCommand(
          input.channel,
          input.before,
          input.after
        );
      default:
        break;
    }
    throw new Error("Method not implemented.");
  }
}
