import { Command, CommandResult } from "../Command";
import { CIEvent } from "../../managers/eventsManagers/Events";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import {
  ResponseManager,
  SlackRichResponse
} from "../../managers/ResponseManager";

export class CiNotificationCommand extends Command {
  private event: CIEvent;

  constructor(event: CIEvent) {
    super();
    this.event = event;
  }

  protected async executeCmd(): Promise<CommandResult> {
    console.log(`About to notify about ${this.event.eventType}`);
    const slackWebhook = await new DynamoDBQueueManager().getWebhookForBranch(
      this.event.branch
    );
    if (slackWebhook) {
      await new ResponseManager().postRichResponse(
        this.getMessageForEvent(slackWebhook)
      );
    } else {
      return {
        success: false,
        result: "Couldn't find slackWebhook"
      };
    }

    return CommandResult.SUCCESS;
  }
  protected validate(): string | true {
    return true;
  }

  private getMessageForEvent(slackWebhook: string): SlackRichResponse {
    const title = `:lock: <${this.event.url}|${this.event.branch}>`;
    const url = slackWebhook;
    switch (this.event.eventType) {
      case "START":
        return {
          title,
          url,
          text: `Merging master`,
          color: null
        };
      case "FAILURE_MERGE":
        return {
          title,
          url,
          text: `Conflicts with master`,
          color: "danger"
        };
      case "START_TEST":
        return {
          url,
          title,
          text: `Merge successful`,
          color: "good"
        };
      case "FAILURE_TEST":
        return {
          url,
          title,
          text: `Test failures`,
          color: "danger"
        };
      case "FAILURE_ABNORMAL":
        return {
          url,
          title,
          text: `Abnormal failure`,
          color: "danger"
        };
      case "SUCCESS":
        return {
          url,
          title,
          text: `Tests successful`,
          color: "good"
        };
    }
  }
}
