import { CommandFactory } from "./CommandFactory";
import { Command, UnknowCommand } from "./commands/Command";
import { PrEvent, DynamoDBQueueManager } from "./Managers";
import { SlackChannel } from "./Queues";
import { REGION, GithubMergeCommand } from "./GithubMergeCommand";

export class GithubCommandFactory implements CommandFactory {
  async buildCommand(prEvent: PrEvent): Promise<Command> {
    switch (prEvent.action) {
      case "closed":
        if (prEvent.pull_request.merged) {
          // PR Has been merged
          const slackChannel: SlackChannel | null = await new DynamoDBQueueManager(
            process.env.dynamoDBQueueTableName || "",
            REGION
          ).getChannelByRepository(prEvent.repository.full_name);
          return slackChannel
            ? new GithubMergeCommand(slackChannel, prEvent)
            : new UnknowCommand();
        }
      default:
        return new UnknowCommand();
    }
  }
}
