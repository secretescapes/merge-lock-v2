import { CommandFactory } from "./CommandFactory";
import { Command } from "../Command";
import { Event } from "../../managers/eventsManagers/Events";
import { QueueChangedCommand } from "../notificationCommands/QueueChangedCommand";
export class NotificationCommandFactory implements CommandFactory {
  async buildCommand(input: Event): Promise<Command> {
    switch (input.eventType) {
      case "QUEUE_CHANGED":
        return new QueueChangedCommand(
          input.channel,
          input.before,
          input.after
        );
      case "MERGE":
        break;
      default:
        break;
    }
    throw new Error("Method not implemented.");
  }
}
