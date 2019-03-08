import { SlackChannel } from "../Queues";
import { DynamoDBQueueManager } from "../Managers";
import { Command, CommandResult, QUEUES_TABLE_NAME, REGION } from "./Command";
export class CreateQueueCommand extends Command {
  private channel: SlackChannel;
  private repository: string | null;
  constructor(channel: SlackChannel, repository: string) {
    super();
    this.channel = channel;
    this.repository = repository;
  }
  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
    try {
      if (!this.repository) {
        return { success: true, result: `Missing params` };
      }
      await dynamoDBManager.createQueue(
        this.channel.toString(),
        this.repository
      );
      return { success: true, result: `Queue has been created` };
    } catch (err) {
      console.log(`ERROR: ${err.toString()}`);
      if (err.toString().indexOf("QueryAlreadyExists") > -1) {
        return {
          success: false,
          result: `There is already a queue on this channel`
        };
      }
      return { success: false, result: `Error creating queue` };
    }
  }
  validate(): string | true {
    if (!this.repository) {
      return `Please, provide a valid repository`;
    }
    if (!/.*\/.*/g.test(this.repository)) {
      return `Please, provide the full repository name ([owner]/[repo name])`;
    }
    return true;
  }
}
