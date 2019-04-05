import { CommandResult } from "../Command";
import { PrEvent } from "../../managers/eventsManagers/Events";
import { GithubEventsManager } from "../../managers/eventsManagers/GithubEventsManager";
import { RemoveFromQueueCommand } from "../queueCommands/RemoveFromQueueCommand";
import { SlackChannel } from "../../Queues";
import { GITHUB_TOPIC, REGION } from "../../environment";

export class GithubMergeCommand extends RemoveFromQueueCommand {
  prEvent: PrEvent;
  constructor(channel: SlackChannel, prEvent: PrEvent) {
    super(prEvent.pull_request.head.ref, channel);
    this.prEvent = prEvent;
  }
  async executeCmd(): Promise<CommandResult> {
    console.log(`New merge, notifiying`);
    await new GithubEventsManager(REGION, GITHUB_TOPIC).publishEvent({
      eventType: "MERGE",
      pullRequestTitle: this.prEvent.pull_request.title,
      pullRequestUrl: this.prEvent.pull_request.html_url,
      branchName: this.prEvent.pull_request.head.ref,
      repoName: this.prEvent.repository.full_name,
      mergedBy: this.prEvent.pull_request.merged_by.login
    });
    return super.executeCmd();
  }
}
