import {
  SlackUser,
  DynamoDBReleaseQueue,
  ReleaseSlot,
  SlackChannel,
} from "../../Queues";
import { DynamoDBQueueManager } from "../../managers/dynamoDBManagers/DynamoDBQueueManager";
import { SlackFormatter } from "../../Formatter";
import { Command, CommandResult } from "../Command";
export class addToQueueCommand extends Command {
  private user: SlackUser | null;
  private branch: string | null;
  private channel: SlackChannel;
  private position: number | null;

  constructor(
    user: SlackUser | null,
    branch: string | null,
    channel: SlackChannel,
    position: number | null = -1
  ) {
    super();
    this.user = user;
    this.branch = branch;
    this.channel = channel;
    this.position = position;
  }
  validate(): string | true {
    if (!this.user) {
      return "Please, provide a valid user";
    }
    if (!this.branch) {
      return "Please, provide a valid branch";
    }
    return true;
  }
  async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager();
    try {
      const queue: DynamoDBReleaseQueue = await dynamoDBManager.getQueue(
        this.channel.toString()
      );
      if (!this.user || !this.branch) {
        return { success: false, result: `Missing params` };
      }
      const newQueue = await queue.add(
        new ReleaseSlot(this.user, this.branch),
        this.position ? this.position - 1 : undefined
      );
      return {
        success: true,
        result: `Added, here is the queue:\n${new SlackFormatter().format(
          newQueue
        )}`,
      };
    } catch (err) {
      console.error(`Error adding to Queue ${this.channel}: ${err}`);
      //TODO: Check for validation errors
      return {
        success: false,
        result: `Error adding to Queue ${this.channel}`,
      };
    }
  }
}
