import { EventsManager } from "./EventsManager";
import { CI_TOPIC, REGION } from "../../environment";
import { CiEvent } from "./Events";

export class CiEventsManager extends EventsManager {
  constructor() {
    super(REGION, CI_TOPIC);
  }
  async publishEvent(event: CiEvent) {
    await this.publish(JSON.stringify(event));
  }
}
