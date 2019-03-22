import { CommandResult } from "../Command";
import { PrEvent, GithubEventsManager, GithubEvent } from "../../Managers";
import { RemoveFromQueueCommand } from "../queueCommands/RemoveFromQueueCommand";
import { SlackChannel } from "../../Queues";
export const REGION = process.env.myRegion || "";
const GITHUB_TOPIC = process.env.githubTopicArn || "";
export class GithubMergeCommand extends RemoveFromQueueCommand {
  prEvent: PrEvent;
  constructor(channel: SlackChannel, prEvent: PrEvent) {
    super(prEvent.pull_request.head.ref, channel);
    this.prEvent = prEvent;
  }
  async executeCmd(): Promise<CommandResult> {
    await new GithubEventsManager(REGION, GITHUB_TOPIC).publishEvent(
      new GithubEvent("MERGE", this.prEvent)
    );
    return super.executeCmd();
  }
}
