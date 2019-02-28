import { DynamoDBReleaseQueue } from "./Queues";

const AWS = require("aws-sdk");
export class DynamoDBManager {
  private tableName: string;
  private dynamodb: any;

  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.dynamodb = new AWS.DynamoDB({ region });
  }

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
}
