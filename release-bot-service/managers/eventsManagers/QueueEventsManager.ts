import { EventsManager } from "./EventsManager";
import { Queue } from "../../Queues";
import { REGION, QUEUE_TOPIC } from "../../environment";
export class QueueEventsManager extends EventsManager {
  constructor() {
    super(REGION, QUEUE_TOPIC);
  }
  async publishEvent(event: QUEUE_CHANGED) {
    this.publish(
      JSON.stringify({
        channel: event.channel,
        before: event.before.toString(),
        after: event.after.toString()
      })
    );
  }
}

export type QUEUE_CHANGED = {
  channel: string;
  before: Queue;
  after: Queue;
};
