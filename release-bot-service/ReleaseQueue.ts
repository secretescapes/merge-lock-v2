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

  async add(item: ReleaseSlot): Promise<Queue> {
    const queue = new Queue();
    queue.items = this.insertInItems(item, this.items);
    return queue;
  }
}
export class ReleaseQueue extends Queue {
  protected channel: string;

  constructor(channel: string) {
    super();
    this.channel = channel;
  }

  getChannel(): string {
    return this.channel;
  }

  async add(releaseSlot: ReleaseSlot): Promise<ReleaseQueue> {
    const queue = new ReleaseQueue(this.channel);
    queue.items = this.insertInItems(releaseSlot, this.items);
    return queue;
  }
}

class ReleaseQueueDynamoDBWrapper {
  channel: { S: string };
  queue?: { S: string };
}

class ReleaseSlotJSONWrapper {
  user: { user_id; username };
  branch: string;
}

export class DynamoDBReleaseQueue extends ReleaseQueue {
  private dynamodb;
  private tableName: string;
  constructor(wrapper: ReleaseQueueDynamoDBWrapper, dynamodb, tableName) {
    super(wrapper.channel.S);
    this.dynamodb = dynamodb;
    this.tableName = tableName;
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

  serialize(): string {
    return JSON.stringify({ items: this.items, channel: this.channel });
  }

  async add(releaseSlot: ReleaseSlot): Promise<DynamoDBReleaseQueue> {
    const newQueue = new DynamoDBReleaseQueue(
      { channel: { S: this.channel } },
      this.dynamodb,
      this.tableName
    );
    newQueue.items = this.insertInItems(releaseSlot, this.items);

    const expresion = {
      ExpressionAttributeNames: {
        "#Q": "queue"
      },
      ExpressionAttributeValues: {
        ":q": { S: newQueue.serialize() }
      },
      Key: {
        channel: {
          S: newQueue.channel
        }
      },
      TableName: this.tableName,
      UpdateExpression: "SET #Q = :q"
    };
    await this.dynamodb.updateItem(expresion).promise();

    return newQueue;
  }
}
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
