import { CommandFactory } from "./CommandFactory";
import { Command, UnknowCommand } from "../Command";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { SlackChannel } from "../../Queues";
import { GithubMergeCommand } from "../githubCommands/GithubMergeCommand";
import { PrEvent } from "../../managers/eventsManagers/Events";
import { REGION, QUEUES_TABLE_NAME } from "../../environment";

export class GithubCommandFactory implements CommandFactory {
  async buildCommand(prEvent: PrEvent): Promise<Command> {
    switch (prEvent.action) {
      case "closed":
        if (prEvent.pull_request.merged) {
          // PR Has been merged
          const slackChannel: SlackChannel | null = await new DynamoDBQueueManager(
            QUEUES_TABLE_NAME,
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
