import { DynamoDBReleaseQueue, SlackChannel, ReleaseQueue } from "../../Queues";
import { DynamoDBManager } from "./DynamoDBManager";
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
  async getChannelByRepository(repo: string): Promise<SlackChannel | null> {
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
        const channelStr = new DynamoDBReleaseQueue(
          response.Items[0],
          this.dynamodb,
          this.tableName
        ).getChannel();
        return SlackChannel.parseFromString(channelStr);
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
            },
            queue: {
              S: new ReleaseQueue(channel).serialize()
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
