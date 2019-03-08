import { DynamoDBReleaseQueue, SlackUser, Queue } from "./Queues";
const AWS = require("aws-sdk");
const axios = require("axios");
class DynamoDBManager {
  protected tableName: string;
  protected dynamodb: any;
  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.dynamodb = new AWS.DynamoDB({ region });
  }
}
export class DynamoDBQueueManager extends DynamoDBManager {
  /**
   * Returns the DynamoDBReleaseQueue for channel or throws an error if
   * there is no queue for that channel.
   * @param channel
   */
  async getQueue(channel: string): Promise<DynamoDBReleaseQueue> {
    console.log(`${channel} - ${this.tableName}`);
    const response = await this.dynamodb
      .getItem({
        Key: {
          channel: {
            S: channel
          }
        },
        TableName: this.tableName
      })
      .promise();
    if (!response.Item) {
      throw new Error("Couldn't find a queue for this channel");
    }
    return new DynamoDBReleaseQueue(
      response.Item,
      this.dynamodb,
      this.tableName
    );
  }

  async getQueueByRepository(
    repo: string
  ): Promise<DynamoDBReleaseQueue | null> {
    console.log(`Searching queue by repo [${repo}]`);
    try {
      const response = await this.dynamodb
        .scan({
          ExpressionAttributeValues: {
            ":repo": {
              S: repo
            }
          },
          FilterExpression: "repository = :repo",
          TableName: this.tableName
        })
        .promise();
      console.log(`Response: ${JSON.stringify(response)}`);
      if (response.Items.length > 0) {
        return new DynamoDBReleaseQueue(
          response.Items[0],
          this.dynamodb,
          this.tableName
        );
      }
    } catch (err) {
      console.error(`Error scanning DB: ${err}`);
    }
    return null;
  }

  /**
   * Creates a queue for the channel provided if none exists already.
   * Otherwise it throws QueryAlreadyExists.
   *
   * Returns the new DynamoDBReleaseQueue created.
   * @param channel
   */
  async createQueue(
    channel: string,
    repository: string
  ): Promise<DynamoDBReleaseQueue> {
    try {
      await this.dynamodb
        .putItem({
          Item: {
            channel: {
              S: channel
            },
            repository: {
              S: repository
            }
          },
          ConditionExpression: "attribute_not_exists(channel)",
          TableName: `${this.tableName}`
        })
        .promise();

      return new DynamoDBReleaseQueue(
        { channel: { S: channel } },
        this.dynamodb,
        this.tableName
      );
    } catch (err) {
      if (err.toString().startsWith("ConditionalCheckFailedException")) {
        console.error(`Queue already exists: ${err}`);
        throw new Error("QueryAlreadyExists");
      }
      console.error(`Error creating queue: ${err}`);
      throw err;
    }
  }
}

export class DynamoDBUserManager extends DynamoDBManager {
  async updateUser(slackUser: SlackUser, githubUsername) {
    try {
      await this.dynamodb
        .putItem({
          Item: {
            username: {
              S: slackUser.toString()
            },
            githubUsername: {
              S: githubUsername
            }
          },
          TableName: `${this.tableName}`
        })
        .promise();
    } catch (err) {
      console.error(`Error storing to dynamodb: ${err}`);
      throw err;
    }
  }
}

export class ResponseManager {
  async postResponse(url: string, text: string) {
    try {
      await axios.post(url, { text });
      console.info("Response sent");
    } catch (error) {
      console.error(`Error sending response: ${error}`);
    }
  }
}
class EventsManager {
  private sns: any;
  private topic: string;
  constructor(region: string, topic: string) {
    this.sns = new AWS.SNS({ region });
    this.topic = topic;
  }
  protected async publish(message: string) {
    try {
      await this.sns
        .publish({
          Message: message,
          TopicArn: this.topic
        })
        .promise();
      console.info("message published");
    } catch (err) {
      console.error(err);
      throw new Error("Error publishing event");
    }
  }
}

export type EventType = "MERGE";
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
export class GithubEvent {
  eventType: EventType;
  originalEvent: PrEvent;
  constructor(type: EventType, originalEvent: PrEvent) {
    this.eventType = type;
    this.originalEvent = originalEvent;
  }
}
export class GithubEventsManager extends EventsManager {
  async publishEvent(event: GithubEvent) {
    await this.publish(JSON.stringify(event));
  }
}

type COMMAND_EVENT = string;
export class CommandEventsManager extends EventsManager {
  async publishEvent(event: COMMAND_EVENT) {
    await this.publish(event);
  }
}

type QUEUE_CHANGED = {
  channel: string;
  before: Queue;
  after: Queue;
};
export class QueueEventsManager extends EventsManager {
  constructor() {
    super(process.env.myRegion || "", process.env.queueTopicArn || "");
  }
  async publishEvent(event: QUEUE_CHANGED) {
    this.publish(
      JSON.stringify({
        channel: event.channel,
        before: event.before.toString(),
        after: event.after.toString()
      })
    );
  }
}
