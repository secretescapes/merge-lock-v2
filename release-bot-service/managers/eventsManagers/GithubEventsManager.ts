import { EventsManager } from "./EventsManager";
import { GithubMergeEvent } from "./Events";
export class GithubEventsManager extends EventsManager {
  async publishEvent(event: GithubMergeEvent) {
    await this.publish(JSON.stringify(event));
  }
}
