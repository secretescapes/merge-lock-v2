export type Event = GithubMergeEvent | QueueChangedEvent;

export type GithubMergeEvent = {
  eventType: "MERGE";
  pullRequestTitle: string;
  pullRequestUrl: string;
  branchName: string;
  repoName: string;
  mergedBy: string;
};

//TODO: Move somewhere else
export type QueueChangedEvent = {
  eventType: "QUEUE_CHANGED";
  channel: string;
  before: string;
  after: string;
};

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

export class CiEvent {
  state:
    | "START"
    | "FAILURE_MERGE"
    | "START_TEST"
    | "FAILURE_TEST"
    | "SUCCESS"
    | "FAILURE_ABNORMAL";
  branch: string;
  url: string;

  static isCiEvent(obj: any): obj is CiEvent {
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
