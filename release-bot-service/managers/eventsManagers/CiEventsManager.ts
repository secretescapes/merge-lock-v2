import { EventsManager } from "./EventsManager";
import { CI_TOPIC, REGION } from "../../environment";
import { CIEvent } from "./Events";

export class CiEventsManager extends EventsManager {
  constructor() {
    super(REGION, CI_TOPIC);
  }
  async publishEvent(event: CIEvent) {
    await this.publish(JSON.stringify(event));
  }
}
