import { DynamoDBReleaseQueue } from "./Queues";

const AWS = require("aws-sdk");
export class DynamoDBManager {
  private tableName: string;
  private dynamodb: any;

  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.dynamodb = new AWS.DynamoDB({ region });
  }

  /**
   * Returns the DynamoDBReleaseQueue for channel or throws an error if
   * there is no queue for that channel.
   * @param channel
   */
  async getQueue(channel: string): Promise<DynamoDBReleaseQueue> {
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
