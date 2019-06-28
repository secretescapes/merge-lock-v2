import { CommandFactory } from "./CommandFactory";
import { Command } from "../Command";
import { Event } from "../../managers/eventsManagers/Events";
import { NotificationQueueChangedCommand } from "../notificationCommands/NotificationQueueChangedCommand";
import { NotifyMergeCommand } from "../notificationCommands/NotifyMergeCommand";
import { CiNotificationCommand } from "../notificationCommands/CiNotificationCommand";
export class NotificationCommandFactory implements CommandFactory {
  async buildCommand(input: Event): Promise<Command> {
    if (
      Event.isQueueChangedEvent(input) &&
      input.eventType === "QUEUE_CHANGED"
    ) {
      return new NotificationQueueChangedCommand(
        input.channel,
        input.before,
        input.after
      );
    } else if (Event.isGithubMergeEvent(input) && input.eventType === "MERGE") {
      return new NotifyMergeCommand(input);
    } else if (Event.isCIEvent(input)) {
      return new CiNotificationCommand(input);
    } else {
      throw new Error("Method not implemented.");
    }
  }
}
