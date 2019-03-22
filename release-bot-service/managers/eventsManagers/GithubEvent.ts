export class GithubEvent {
  eventType: EventType;
  originalEvent: PrEvent;
  constructor(type: EventType, originalEvent: PrEvent) {
    this.eventType = type;
    this.originalEvent = originalEvent;
  }
}

export type PrEvent = {
  action: "opened" | "closed";
  number: number;
  pull_request: {
    html_url: string;
    title: string;
    locked: boolean;
    merged: boolean;
    head: {
      ref: string;
    };
    merged_by: {
      login: string;
    };
  };
  repository: {
    full_name: string;
  };
  sender: {
    login: string;
  };
};

type EventType = "MERGE";
