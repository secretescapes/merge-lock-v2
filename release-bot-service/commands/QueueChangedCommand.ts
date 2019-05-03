import { Command } from "./Command";
import { Queue } from "../Queues";

export abstract class QueueChangedCommand extends Command {
  queueStrBefore: string;
  queueStrAfter: string;
  channelStr: string;

  constructor(channel: string, before: string, after: string) {
    super();
    this.queueStrAfter = after;
    this.queueStrBefore = before;
    this.channelStr = channel;
  }

  protected validate(): string | true {
    return true;
  }

  protected getBeforeQueue(): Queue {
    return Queue.deserialize(this.queueStrBefore);
  }

  protected getAfterQueue(): Queue {
    return Queue.deserialize(this.queueStrAfter);
  }

  protected isNewTop(): boolean {
    return Queue.isNewTop(
      Queue.deserialize(this.queueStrBefore),
      Queue.deserialize(this.queueStrAfter)
    );
  }
}
