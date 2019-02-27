export class SlackUser {
  username: string;
  user_id: string;

  constructor(username: string, userId: string) {
    this.username = username;
    this.user_id = userId;
  }

  clone(): SlackUser {
    return new SlackUser(this.username, this.user_id);
  }
}
export class ReleaseSlot {
  private user: SlackUser;
  private branch: string;
  constructor(user: SlackUser, branch: string) {
    this.user = user;
    this.branch = branch;
  }

  getUser(): SlackUser {
    return this.user;
  }

  getBranch(): string {
    return this.branch;
  }

  clone(): ReleaseSlot {
    return new ReleaseSlot(this.user.clone(), this.branch);
  }
}
export class Queue {
  protected items: ReleaseSlot[];

  constructor() {
    this.items = [];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  getReleaseSlots(): ReleaseSlot[] {
    return this.items;
  }

  protected insertInItems(
    item: ReleaseSlot,
    releaseSlots: ReleaseSlot[]
  ): ReleaseSlot[] {
    const items = releaseSlots.map(itm => itm.clone());
    items.push(item);
    return items;
  }

  add(item: ReleaseSlot): Queue {
    const queue = new Queue();
    queue.items = this.insertInItems(item, this.items);
    return queue;
  }
}
export class ReleaseQueue extends Queue {
  private channel: string;

  constructor(channel: string) {
    super();
    this.channel = channel;
  }

  getChannel(): string {
    return this.channel;
  }

  add(releaseSlot: ReleaseSlot): ReleaseQueue {
    const queue = new ReleaseQueue(this.channel);
    queue.items = this.insertInItems(releaseSlot, this.items);
    return queue;
  }
}

class ReleaseQueueDynamoDBWrapper {
  channel: any;
  queue?: { S: string };
}

class ReleaseSlotJSONWrapper {
  user: { user_id; username };
  branch: string;
}

export class DynamoDBReleaseQueue extends ReleaseQueue {
  constructor(wrapper: ReleaseQueueDynamoDBWrapper) {
    super(wrapper.channel["S"]);
    const slotWrappers: ReleaseSlotJSONWrapper[] = wrapper.queue
      ? JSON.parse(wrapper.queue.S)["items"]
      : [];
    this.items = slotWrappers.map(
      wrapper =>
        new ReleaseSlot(
          new SlackUser(wrapper.user.username, wrapper.user.user_id),
          wrapper.branch
        )
    );
  }
}
const AWS = require("aws-sdk");
export class DynamoDBManager {
  private tableName: string;
  private region: string;
  private dynamodb: any;

  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.region = region;
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
    return new DynamoDBReleaseQueue(response.Item);
  }

  async addToQueue(
    releaseSlot: ReleaseSlot,
    releaseQueue: DynamoDBReleaseQueue
  ): Promise<DynamoDBReleaseQueue> {
    const newReleaseQueue = releaseQueue.add(releaseSlot);
    await this.dynamodb
      .updateItem({
        //TODO: Add condition so we only update if the queue hasn't changed
        ExpressionAttributeNames: {
          "#Q": "queue"
        },
        ExpressionAttributeValues: {
          ":q": { S: JSON.stringify(newReleaseQueue) }
        },
        Key: {
          channel: {
            S: newReleaseQueue.getChannel()
          }
        },
        TableName: process.env.dynamoDBQueueTableName,
        UpdateExpression: "SET #Q = :q"
      })
      .promise();

    return newReleaseQueue;
  }
}
