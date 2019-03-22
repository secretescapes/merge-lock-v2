export type Event = GithubEvent | QueueChangedEvent;

export type GithubEvent = {
  eventType: "MERGE";
  originalEvent: PrEvent;
};

//TODO: Move somewhere else
export type QueueChangedEvent = {
  eventType: "QUEUE_CHANGED";
  channel: string;
  before: string;
  after: string;
};
type EventType = "MERGE" | "QUEUE_CHANGED";

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
