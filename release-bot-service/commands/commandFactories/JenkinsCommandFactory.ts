import { CommandFactory } from "./CommandFactory";
import { Command } from "../Command";
import { JenkinsQueueChangedCommand } from "../jenkinsCommands/JenkinsQueueChangedCommand";

export class JenkinsCommandFactory implements CommandFactory {
  async buildCommand(input: any): Promise<Command> {
    switch (input.eventType) {
      case "QUEUE_CHANGED":
        return new JenkinsQueueChangedCommand(
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
