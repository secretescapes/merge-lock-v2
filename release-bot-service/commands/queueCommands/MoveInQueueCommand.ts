import { Command, CommandResult } from "../Command";
import { SlackChannel, DynamoDBReleaseQueue } from "../../Queues";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { QUEUES_TABLE_NAME, REGION } from "../../environment";
import { SlackFormatter } from "../../Formatter";

export class MoveInQueueCommand extends Command {
  private branch: string | null;
  private channel: SlackChannel;
  private position: number | null;

  constructor(
    branch: string | null,
    channel: SlackChannel,
    position: number | null
  ) {
    super();
    this.branch = branch;
    this.channel = channel;
    this.position = position;
  }

  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
    if (!this.branch || !this.position) {
      console.error(`This should never happen`);
      return { success: false, result: `Missing params` };
    }
    try {
      console.log(`Getting queue`);
      const queue: DynamoDBReleaseQueue = await dynamoDBManager.getQueue(
        this.channel.toString()
      );
      console.log(`Queue retrieved.`);
      const newQueue = await queue.move(this.branch, this.position - 1);
      return {
        success: true,
        result: `Moved, here is the queue:\n${new SlackFormatter().format(
          newQueue
        )}`
      };
    } catch (err) {
      console.error(`Error moving in queue: ${err}`);
      return { success: false, result: `Error moving in queue ${err}` };
    }
  }
  protected validate(): string | true {
    if (!this.branch) {
      return `Please, provide a valid branch`;
    }
    if (!this.position || this.position < 1) {
      return `Please, provide a valid position (>0)`;
    }
    return true;
  }
}
