import { EventsManager } from "./EventsManager";
export class CommandEventsManager extends EventsManager {
  async publishEvent(event: COMMAND_EVENT) {
    await this.publish(event);
  }
}

type COMMAND_EVENT = string;
