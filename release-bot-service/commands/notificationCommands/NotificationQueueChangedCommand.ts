import { CommandResult } from "../Command";
import { Queue } from "../../Queues";
import { ResponseManager } from "../../managers/ResponseManager";
import { SlackFormatter } from "../../Formatter";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { QUEUES_TABLE_NAME, REGION } from "../../environment";
import { QueueChangedCommand } from "../QueueChangedCommand";

export class NotificationQueueChangedCommand extends QueueChangedCommand {
  protected async executeCmd(): Promise<CommandResult> {
    console.log(`Checking if the top has changed...`);
    if (this.isNewTop()) {
      console.log(`Notifying (top has changed)...`);
      console.log(`Retrieving slack webhook url...`);
      const slackWebhook = await new DynamoDBQueueManager().getSlackWebhookForChannel(
        this.channelStr
      );
      if (!slackWebhook) {
        console.error(`Couldn't find slackWebhook for ${this.channelStr}`);
        return {
          success: false,
          result: `Couldn't find slackWebhook for ${this.channelStr}`
        };
      }
      console.log(`retrieved slack webhook url [${slackWebhook}]`);
      const after: Queue = this.getAfterQueue();
      await new ResponseManager().postResponse(
        slackWebhook,
        `There is someone new at the top!\n${new SlackFormatter().format(
          after
        )}`
      );
    }

    return { success: true, result: "" };
  }
}
