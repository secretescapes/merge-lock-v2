import { Command, CommandResult } from "../Command";
import { GithubMergeEvent } from "../../managers/eventsManagers/Events";
import { DynamoDBUserManager } from "../../managers/dynamoDBManagers/DynamoDBUserManager";
import { SlackUser } from "../../Queues";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { ResponseManager } from "../../managers/ResponseManager";

export class NotifyMergeCommand extends Command {
  githubMergeEvent: GithubMergeEvent;
  constructor(event: GithubMergeEvent) {
    super();
    this.githubMergeEvent = event;
  }
  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBQueueManager: DynamoDBQueueManager = new DynamoDBQueueManager();
    const repo = this.githubMergeEvent.repoName;
    console.log(`Retrieving channel for repo ${repo}`);
    const [
      slackChannel,
      slackWebhook
    ] = (await dynamoDBQueueManager.getChannelAndWebhookByRepository(repo)) || [
      null,
      null
    ];
    if (!slackChannel || !slackWebhook) {
      console.error(`Could not find slackChannel or slackWebhook`);
      return {
        success: false,
        result: "Could not find slackChannel or slackWebhook"
      };
    }
    console.log(
      `Retrieved slackChannel ${slackChannel} and slackWebhook ${slackWebhook}`
    );
    console.log(`Retrieving user from event....`);
    const mergedByUser: SlackUser | string =
      (await new DynamoDBUserManager().getSlackUserByGithubUsername(
        this.githubMergeEvent.mergedBy
      )) || this.githubMergeEvent.mergedBy;
    console.log(`user: ${mergedByUser}`);

    await new ResponseManager().postResponse(
      slackWebhook,
      `${mergedByUser.toString()} has merged branch ${
        this.githubMergeEvent.branchName
      }`
    );

    return CommandResult.SUCCESS;
  }
  protected validate(): string | true {
    return true;
  }
}
