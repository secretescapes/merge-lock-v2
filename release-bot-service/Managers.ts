import { DynamoDBReleaseQueue, SlackUser } from "./Queues";
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

  /**
   * Creates a queue for the channel provided if none exists already.
   * Otherwise it throws QueryAlreadyExists.
   *
   * Returns the new DynamoDBReleaseQueue created.
   * @param channel
   */
  async createQueue(channel: string): Promise<DynamoDBReleaseQueue> {
    try {
      await this.dynamodb
        .putItem({
          Item: {
            channel: {
              S: channel
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

abstract class SnsManager {
  protected sns: any;
  constructor(region: string) {
    this.sns = new AWS.SNS({ region });
  }

  abstract async publish(message: string);
}

export class CommandEventManager extends SnsManager {
  private topic: string;
  constructor(region: string, topic: string) {
    super(region);
    this.topic = topic;
  }
  async publish(message: string) {
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
