import { SlackChannel } from "../Queues";
import { DynamoDBQueueManager } from "../Managers";
import { Command, CommandResult, QUEUES_TABLE_NAME, REGION } from "./Command";
export class CreateQueueCommand extends Command {
  private channel: SlackChannel;
  constructor(channel: SlackChannel) {
    super();
    this.channel = channel;
  }
  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
    try {
      await dynamoDBManager.createQueue(this.channel.toString());
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
    return true;
  }
}
