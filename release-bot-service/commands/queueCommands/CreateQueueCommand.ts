import { SlackChannel } from "../../Queues";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { Command, CommandResult } from "../Command";
import { QUEUES_TABLE_NAME, REGION } from "../../environment";
export class CreateQueueCommand extends Command {
  private channel: SlackChannel;
  private repository: string | null;
  private slackWebhook: string | null;
  private ciUrl: string | null;
  constructor(
    channel: SlackChannel,
    repository: string | null,
    slackWebhook: string | null,
    ciUrl: string | null
  ) {
    super();
    this.channel = channel;
    this.repository = repository;
    this.slackWebhook = slackWebhook;
    this.ciUrl = ciUrl;
  }
  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager();
    try {
      if (
        !this.channel ||
        !this.repository ||
        !this.slackWebhook ||
        !this.ciUrl
      ) {
        return { success: true, result: `Missing params` };
      }
      await dynamoDBManager.createQueue(
        this.channel.toString(),
        this.repository,
        this.slackWebhook,
        this.ciUrl
      );
      return { success: true, result: `Queue has been created` };
    } catch (err) {
      console.log(`ERROR: ${err.toString()}`);
      if (err.toString().indexOf("QueryAlreadyExists") > -1) {
        return {
          success: false,
          result: `There is already a queue on this channel`
        };
      }
      return { success: false, result: `Error creating queue` };
    }
  }
  validate(): string | true {
    if (!this.repository) {
      return `Please, provide a valid repository`;
    }
    if (!/.*\/.*/g.test(this.repository)) {
      return `Please, provide the full repository name ([owner]/[repo name])`;
    }
    if (!this.slackWebhook) {
      return `Please, provide a valid webhook`;
    }

    if (!/https:\/\/hooks.slack.com\/services.*/g.test(this.slackWebhook)) {
      return `Please, provide a valid webhook url`;
    }

    if (!this.ciUrl) {
      return `Please, provide a valid CI url where I will send post requests when a new branch is on the top`;
    }
    return true;
  }
}
