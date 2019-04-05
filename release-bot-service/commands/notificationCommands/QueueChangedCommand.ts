import { Command, CommandResult } from "../Command";
import { Queue, ReleaseSlot } from "../../Queues";
import { ResponseManager } from "../../managers/ResponseManager";
import { SlackFormatter } from "../../Formatter";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { QUEUES_TABLE_NAME, REGION } from "../../environment";

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
    console.log(
      `AFTER: ${JSON.stringify(Queue.deserialize(this.queueStrAfter))}`
    );
    const before: Queue = Queue.deserialize(this.queueStrBefore);
    const after: Queue = Queue.deserialize(this.queueStrAfter);
    const isNewTop = this.isNewTop(before, after);
    if (isNewTop) {
      console.log(`Notifying (top has changed)...`);
      console.log(`Retrieving slack webhook url...`);
      const slackWebhook = await new DynamoDBQueueManager(
        QUEUES_TABLE_NAME,
        REGION
      ).getSlackWebhookForChannel(this.channelStr);
      if (!slackWebhook) {
        console.error(`Couldn't find slackWebhook for ${this.channelStr}`);
        return {
          success: false,
          result: `Couldn't find slackWebhook for ${this.channelStr}`
        };
      }
      console.log(`retrieved slack webhook url [${slackWebhook}]`);
      await new ResponseManager().postResponse(
        slackWebhook,
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
