import { EventsManager } from "./EventsManager";
import { REGION, QUEUE_TOPIC } from "../../environment";
import { QueueChangedEvent } from "./Events";
export class QueueEventsManager extends EventsManager {
  constructor() {
    super(REGION, QUEUE_TOPIC);
  }
  async publishEvent(event: QueueChangedEvent) {
    console.log(`PUBLISHING EVENT IN ${QUEUE_TOPIC}`);
    await this.publish(JSON.stringify(event));
  }
}
