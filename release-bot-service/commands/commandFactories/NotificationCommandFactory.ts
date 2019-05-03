import { CommandFactory } from "./CommandFactory";
import { Command } from "../Command";
import { Event } from "../../managers/eventsManagers/Events";
import { NotificationQueueChangedCommand } from "../notificationCommands/NotificationQueueChangedCommand";
import { NotifyMergeCommand } from "../notificationCommands/NotifyMergeCommand";
export class NotificationCommandFactory implements CommandFactory {
  async buildCommand(input: Event): Promise<Command> {
    switch (input.eventType) {
      case "QUEUE_CHANGED":
        return new NotificationQueueChangedCommand(
          input.channel,
          input.before,
          input.after
        );
      case "MERGE":
        return new NotifyMergeCommand(input);
      default:
        break;
    }
    throw new Error("Method not implemented.");
  }
}
