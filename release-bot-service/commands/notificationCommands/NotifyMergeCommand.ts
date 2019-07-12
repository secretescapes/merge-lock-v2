import { Command, CommandResult } from "../Command";
import { GithubMergeEvent } from "../../managers/eventsManagers/Events";
import { DynamoDBUserManager } from "../../managers/dynamoDBManagers/DynamoDBUserManager";
import { SlackUser } from "../../Queues";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { ResponseManager } from "../../managers/ResponseManager";
import * as moment from "moment-timezone";

type ReleaseWindowDefinition = {
  timezone: string;
  // Sunday: 0 Saturday: 6
  day: {
    start: number;
    end: number;
  };
  // 0 - 23
  hour: {
    start: number;
    end: number;
  };
};

const DEFAULT_RELEASE_WINDOW_DEF: ReleaseWindowDefinition = {
  timezone: "Europe/London",
  day: {
    start: 1, // Monday
    end: 4 //Thursday
  },
  hour: {
    start: 9,
    end: 16
  }
};

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

    const msg = this.isReleaseWindowOpen()
      ? `${mergedByUser.toString()} has merged branch ${
          this.githubMergeEvent.branchName
        }`
      : `${mergedByUser.toString()} has merged branch ${
          this.githubMergeEvent.branchName
        } when the release window is closed`;
    await new ResponseManager().postResponse(slackWebhook, msg);

    return CommandResult.SUCCESS;
  }
  protected validate(): string | true {
    return true;
  }

  private isReleaseWindowOpen(
    releaseWindowDefinition: ReleaseWindowDefinition = DEFAULT_RELEASE_WINDOW_DEF
  ): boolean {
    const now = moment().tz(releaseWindowDefinition.timezone);
    console.log(
      `Checking release window open Day: ${now.day()} Hour: ${now.hour()}`
    );
    if (
      now.day() >= releaseWindowDefinition.day.start &&
      now.day() <= releaseWindowDefinition.day.end
    ) {
      if (
        now.hour() >= releaseWindowDefinition.hour.start &&
        now.hour() <= releaseWindowDefinition.hour.end
      ) {
        return true;
      }
    }
    return false;
  }
}
