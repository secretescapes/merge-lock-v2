import { Command, CommandResult } from "../Command";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { DynamoDBReleaseQueue, SlackChannel } from "../../Queues";
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
    console.log(`Checking if item needs to be removed from queue...`);
    const dynamoDBManager = new DynamoDBQueueManager();
    try {
      const queue: DynamoDBReleaseQueue = await dynamoDBManager.getQueue(
        this.channel.toString()
      );
      if (!this.branch) {
        console.error(`This should never happen`);
        return { success: false, result: `Missing params` };
      }
      const newQueue = await queue.remove(this.branch);
      return {
        success: true,
        result: `Removed, here is the queue:\n${new SlackFormatter().format(
          newQueue
        )}`,
      };
    } catch (err) {
      console.error(`Error removing from the Queue ${this.channel}: ${err}`);
      return {
        success: false,
        result: `Error removing from Queue ${this.channel}`,
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
