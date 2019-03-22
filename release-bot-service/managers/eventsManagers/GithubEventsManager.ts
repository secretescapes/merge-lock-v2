import { EventsManager } from "./EventsManager";
import { GithubEvent } from "./Events";
export class GithubEventsManager extends EventsManager {
  async publishEvent(event: GithubEvent) {
    await this.publish(JSON.stringify(event));
  }
}
