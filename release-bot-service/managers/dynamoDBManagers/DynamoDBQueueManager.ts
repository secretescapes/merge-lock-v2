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
    const response = await this.retrieveQueueDataForChannel(channel);
    if (!response.Item) {
      throw new Error("Couldn't find a queue for this channel");
    }
    return new DynamoDBReleaseQueue(
      response.Item,
      this.dynamodb,
      this.tableName
    );
  }

  async getCiUrlForChannel(channel: string): Promise<string | null> {
    const response = await this.retrieveQueueDataForChannel(channel);
    if (!response.Item) {
      throw new Error(`Couldn't find a queue for this channel ${channel}`);
    }
    return response.Item.ciUrl.S;
  }
  async getSlackWebhookForChannel(channel: string): Promise<string | null> {
    const response = await this.retrieveQueueDataForChannel(channel);
    if (!response.Item) {
      throw new Error("Couldn't find a queue for this channel");
    }
    return response.Item.slackWebhook.S;
  }

  async getWebhookForBranch(branch: string): Promise<string | null> {
    const response = await this.retrieveQueueDataForBranch(branch);
    try {
      if (response.Items.length > 0) {
        return response.Items[0].slackWebhook.S;
      }
    } catch (err) {
      console.error(`Error scanning DB ${err}`);
    }
    return null;
  }

  async getChannelAndWebhookByRepository(
    repo: string
  ): Promise<[SlackChannel, string] | null> {
    console.log(`Searching queue by repo [${repo}]`);
    try {
      const response = await this.retrieveQueueDataForRepo(repo);
      if (response.Items.length > 0) {
        const slackChannel = SlackChannel.parseFromString(
          response.Items[0].channel.S
        );
        if (slackChannel) {
          return [slackChannel, response.Items[0].slackWebhook.S];
        }
      }
    } catch (err) {
      console.error(`Error scanning DB ${err}`);
    }
    return null;
  }

  async getChannelByRepository(repo: string): Promise<SlackChannel | null> {
    console.log(`Searching queue by repo [${repo}]`);
    const slackChannelAndWebhook:
      | [SlackChannel, string]
      | null = await this.getChannelAndWebhookByRepository(repo);
    return slackChannelAndWebhook ? slackChannelAndWebhook[0] : null;
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
    repository: string,
    slackWebhook: string,
    ciUrl: string
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
            slackWebhook: {
              S: slackWebhook
            },
            ciUrl: {
              S: ciUrl
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

  private async retrieveQueueDataForChannel(channel: string): Promise<any> {
    return await this.dynamodb
      .getItem({
        Key: {
          channel: {
            S: channel
          }
        },
        TableName: this.tableName
      })
      .promise();
  }

  private async retrieveQueueDataForRepo(repo: string): Promise<any> {
    return await this.dynamodb
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
  }

  private async retrieveQueueDataForBranch(branch: string): Promise<any> {
    return await this.dynamodb
      .scan({
        ExpressionAttributeValues: {
          ":branch": {
            S: branch
          }
        },
        FilterExpression: "contains (queue, :branch)",
        TableName: this.tableName
      })
      .promise();
  }
}
