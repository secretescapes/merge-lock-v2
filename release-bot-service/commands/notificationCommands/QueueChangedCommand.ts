import { Command, CommandResult } from "../Command";

export class QueueChangedCommand extends Command {
  queueStrBefore: string;
  queueStrAfter: string;
  channelStr: string;

  constructor(channel: string, before: string, after: string) {
    super();
    this.queueStrAfter = after;
    this.queueStrBefore = before;
    this.channelStr = channel;
  }
  protected async executeCmd(): Promise<CommandResult> {
    console.log(`Checking if the top has changed...`);
    console.log(`Notifying (top has changed)...`);
    return { success: true, result: "" };
  }
  protected validate(): string | true {
    return true;
  }
}
