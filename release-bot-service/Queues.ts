import {
  CompositeValidator,
  CompositeResult,
  BranchIsNotInQueueValidator,
  BranchHasPrValidator
} from "./Validators";

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

  toString(): string {
    return `<@${this.user_id}|${this.username}>`;
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

  protected async validate(releaseSlot: ReleaseSlot) {}

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

export class ValidationError extends Error {
  errors: string[];
  constructor(errors: string[]) {
    super();
    this.errors = errors;
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

  protected async validate(releaseSlot: ReleaseSlot) {
    super.validate(releaseSlot);
    const validation: CompositeResult = await new CompositeValidator(
      new BranchIsNotInQueueValidator(),
      new BranchHasPrValidator()
    ).validate(this, releaseSlot);

    if (validation.hasErrors()) {
      throw new ValidationError(validation.getErrors());
    }
  }

  async add(releaseSlot: ReleaseSlot): Promise<ReleaseQueue> {
    await this.validate(releaseSlot);
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
    await this.validate(releaseSlot);
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
        ":q": { S: newQueue.serialize() },
        ":oldQ": { S: this.serialize() }
      },
      Key: {
        channel: {
          S: newQueue.channel
        }
      },
      TableName: this.tableName,
      UpdateExpression: "SET #Q = :q",
      // Only update if value is still the same that was read before.
      ConditionExpression: "#Q = :oldQ"
    };
    await this.dynamodb.updateItem(expresion).promise();

    return newQueue;
  }
}
