import { Command, CommandResult } from "../Command";
import { SlackChannel, DynamoDBReleaseQueue } from "../../Queues";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { SlackFormatter } from "../../Formatter";

type BACK = "BACK";
type POSITION = BACK | number;

export class MoveInQueueCommand extends Command {
  private branch: string | null;
  private channel: SlackChannel;
  private position: POSITION | null;

  constructor(
    branch: string | null,
    channel: SlackChannel,
    position: POSITION | null
  ) {
    super();
    this.branch = branch;
    this.channel = channel;
    this.position = position;
  }

  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager();
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
      const newPosition = this.resolveNewPosition(queue);
      const newQueue = await queue.move(this.branch, newPosition);
      return {
        success: true,
        result: `Moved, here is the queue:\n${new SlackFormatter().format(
          newQueue
        )}`,
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
    if (!this.position) {
      return `Please, provide a valid position (>0)`;
    }
    return this.validatePosition();
  }

  private resolveNewPosition(queue: DynamoDBReleaseQueue): number {
    if (!this.position || !this.branch) {
      throw Error();
    }
    if (this.position === "BACK") {
      return queue.indexOf(this.branch) + 1;
    }
    return this.position - 1;
  }
  private validatePosition(): string | true {
    if (<number>this.position < 1) {
      return `Please, provide a valid position (>0)`;
    }
    return true;
  }
}
