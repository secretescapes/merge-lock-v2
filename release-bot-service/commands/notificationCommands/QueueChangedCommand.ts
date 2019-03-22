import { Command, CommandResult } from "../Command";
import { Queue, ReleaseSlot } from "../../Queues";
import { ResponseManager } from "../../managers/ResponseManager";
import { SLACK_INCOMING_WEBHOOK_URL } from "../../environment";
import { SlackFormatter } from "../../Formatter";

export class QueueChangedCommand extends Command {
  queueStrBefore: string;
  queueStrAfter: string;
  channelStr: string;

  constructor(channel: string, before: string, after: string) {
    super();
    this.queueStrAfter = after;
    this.queueStrBefore = before;
    this.channelStr = channel;
  }
  protected async executeCmd(): Promise<CommandResult> {
    console.log(`Checking if the top has changed...`);
    const before: Queue = Queue.deserialize(this.queueStrBefore);
    const after: Queue = Queue.deserialize(this.queueStrAfter);
    const isNewTop = this.isNewTop(before, after);
    if (isNewTop) {
      console.log(`Notifying (top has changed)...`);
      // TODO: Send response to channel and include new status of the queue
      await new ResponseManager().postResponse(
        SLACK_INCOMING_WEBHOOK_URL,
        `There is someone new at the top!\n${new SlackFormatter().format(
          after
        )}`
      );
    }

    return { success: true, result: "" };
  }
  protected validate(): string | true {
    return true;
  }

  private isNewTop(before: Queue, after: Queue) {
    if (!after.isEmpty()) {
      if (before.isEmpty()) {
        return true;
      } else {
        const previousFirst: ReleaseSlot = before.getReleaseSlots()[0];
        const currentFirst: ReleaseSlot = after.getReleaseSlots()[0];
        if (!previousFirst.equals(currentFirst)) {
          return true;
        }
      }
    }
    return false;
  }
}
