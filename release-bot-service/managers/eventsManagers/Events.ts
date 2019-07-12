export abstract class Event {
  eventType: String;

  static isGithubMergeEvent(obj: Event): obj is GithubMergeEvent {
    return obj && typeof obj === "object" && obj.eventType === "MERGE";
  }
  static isCIEvent(obj: Event): obj is CIEvent {
    return (
      obj &&
      typeof obj === "object" &&
      (obj.eventType === "START" ||
        obj.eventType === "FAILURE_MERGE" ||
        obj.eventType === "START_TEST" ||
        obj.eventType === "FAILURE_TEST" ||
        obj.eventType === "SUCCESS" ||
        obj.eventType === "FAILURE_ABNORMAL")
    );
  }

  static isQueueChangedEvent(obj: Event): obj is QueueChangedEvent {
    return obj && typeof obj === "object" && obj.eventType === "QUEUE_CHANGED";
  }

  static isQueueReleaseWindowChanged(
    obj: Event
  ): obj is QueueReleaseWindowChanged {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj["channel"] === "string" &&
      (obj["eventType"] === "WINDOW_CLOSED" ||
        obj["eventType"] === "WINDOW_OPEN")
    );
  }
}

export class CIEvent extends Event {
  eventType:
    | "START"
    | "FAILURE_MERGE"
    | "START_TEST"
    | "FAILURE_TEST"
    | "SUCCESS"
    | "FAILURE_ABNORMAL";
  branch: string;
  url: string;
}
export class GithubMergeEvent extends Event {
  eventType: "MERGE";
  pullRequestTitle: string;
  pullRequestUrl: string;
  branchName: string;
  repoName: string;
  mergedBy: string;
}

export class QueueChangedEvent extends Event {
  eventType: "QUEUE_CHANGED";
  channel: string;
  before: string;
  after: string;
}

export class QueueReleaseWindowChanged extends Event {
  eventType: "WINDOW_OPEN" | "WINDOW_CLOSED";
  channel: string;
}
export class QueueReleaseWindowOpen extends QueueReleaseWindowChanged {
  eventType: "WINDOW_OPEN";
  channel: string;
}

export class QueueReleaseWindowClosed extends QueueReleaseWindowChanged {
  eventType: "WINDOW_CLOSED";
  channel: string;
}

// External  Event (Github)
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

// External  Event (CI)
export class CiUpdate {
  state:
    | "START"
    | "FAILURE_MERGE"
    | "START_TEST"
    | "FAILURE_TEST"
    | "SUCCESS"
    | "FAILURE_ABNORMAL";
  branch: string;
  url: string;

  static isCiUpdate(obj: any): obj is CiUpdate {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj["branch"] === "string" &&
      typeof obj["url"] === "string" &&
      (obj["state"] === "START" ||
        obj["state"] === "FAILURE_MERGE" ||
        obj["state"] === "START_TEST" ||
        obj["state"] === "FAILURE_TEST" ||
        obj["state"] === "SUCCESS" ||
        obj["state"] === "FAILURE_ABNORMAL")
    );
  }
}
