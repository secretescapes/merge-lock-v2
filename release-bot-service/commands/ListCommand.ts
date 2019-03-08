import { SlackChannel } from "../Queues";
import { DynamoDBQueueManager } from "../Managers";
import { SlackFormatter } from "../Formatter";
import { Command, CommandResult, QUEUES_TABLE_NAME, REGION } from "./Command";
export class ListCommand extends Command {
  private channel: SlackChannel;
  validate(): string | true {
    return true;
  }
  constructor(channel: SlackChannel) {
    super();
    this.channel = channel;
  }
  async executeCmd(): Promise<CommandResult> {
    try {
      const queue = await new DynamoDBQueueManager(
        QUEUES_TABLE_NAME,
        REGION
      ).getQueue(this.channel.toString());
      return { success: true, result: new SlackFormatter().format(queue) };
    } catch (err) {
      console.error(`Error retrieving from dynamodb: ${err}`);
      return { success: false, result: `Error retriving queue` };
    }
  }
}
