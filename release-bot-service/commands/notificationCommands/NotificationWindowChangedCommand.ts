import { Command, CommandResult } from "../Command";
import { ResponseManager } from "../../managers/ResponseManager";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";

export class NotificationWindowChangedCommand extends Command {
  private channel: string;
  private status: "WINDOW_OPEN" | "WINDOW_CLOSED";

  constructor(channel: string, status: "WINDOW_OPEN" | "WINDOW_CLOSED") {
    super();
    this.channel = channel;
    this.status = status;
  }

  protected async executeCmd(): Promise<CommandResult> {
    console.log(
      `Executing NotificationWindowChangedCommand channel:[${
        this.channel
      }] status: [${this.status}]`
    );
    const slackWebhook = await new DynamoDBQueueManager().getSlackWebhookForChannel(
      this.channel
    );
    if (!slackWebhook) {
      console.error(`Couldn't retrieve slack webhook for ${this.channel}`);
      return {
        success: false,
        result: `Couldn't retrieve slack webhook for ${this.channel}`
      };
    }
    await new ResponseManager().postResponse(
      slackWebhook,
      this.status == "WINDOW_OPEN"
        ? "The release queue is open"
        : "The release queue is closed"
    );

    return CommandResult.SUCCESS;
  }

  protected validate(): string | true {
    return true;
  }
}
