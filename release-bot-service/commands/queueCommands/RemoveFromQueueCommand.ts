import { Command, CommandResult, QUEUES_TABLE_NAME, REGION } from "../Command";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { DynamoDBReleaseQueue, ReleaseSlot, SlackChannel } from "../../Queues";
import { SlackFormatter } from "../../Formatter";

export class RemoveFromQueueCommand extends Command {
  private branch: string | null;
  private channel: SlackChannel;

  constructor(branch: string, channel: SlackChannel) {
    super();
    this.branch = branch;
    this.channel = channel;
  }
  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
    try {
      const queue: DynamoDBReleaseQueue = await dynamoDBManager.getQueue(
        this.channel.toString()
      );
      if (!this.branch) {
        return { success: false, result: `Missing params` };
      }
      const newQueue = await queue.remove(this.branch);
      return {
        success: true,
        result: `Removed, here is the queue:\n${new SlackFormatter().format(
          newQueue
        )}`
      };
    } catch (err) {
      console.error(`Error removing from the Queue ${this.channel}: ${err}`);
      return {
        success: false,
        result: `Error removing from Queue ${this.channel}`
      };
    }
  }
  protected validate(): string | true {
    if (!this.branch) {
      return `Please provide a valid branch`;
    }
    return true;
  }
}
