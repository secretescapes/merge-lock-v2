import {
  CompositeValidator,
  ValidatorResult,
  BranchIsNotInQueueValidator,
  BranchHasPrValidator
} from "./Validators";
import * as _ from "underscore";
import * as arrayMove from "array-move";
import { QueueEventsManager } from "./managers/eventsManagers/QueueEventsManager";

export class SlackUser {
  private username: string;
  private user_id: string;

  constructor(username: string, userId: string) {
    this.username = username;
    this.user_id = userId;
  }

  equals(slackUser: SlackUser): boolean {
    return (
      this.username === slackUser.username && this.user_id === slackUser.user_id
    );
  }
  clone(): SlackUser {
    return new SlackUser(this.username, this.user_id);
  }

  toString(): string {
    return `<@${this.user_id}|${this.username}>`;
  }

  static parseFromString(str: string): SlackUser | null {
    const match = /<@([a-z,A-Z,0-9]{9})\|([\w\.]+)>/.exec(str);
    if (match && match.length === 3) {
      return new SlackUser(match[2], match[1]);
    }
    return null;
  }
}

export class SlackChannel {
  private channelName: string;
  private channelId: String;
  constructor(channelName: string, channelId: string) {
    this.channelId = channelId;
    this.channelName = channelName;
  }
  toString(): string {
    return `<#${this.channelId}|${this.channelName}>`;
  }

  static parseFromString(str: string): SlackChannel | null {
    const match = /^\<#([0-9,A-Z]{9})\|(.{1,21})\>$/.exec(str);
    if (match && match.length === 3) {
      return new SlackChannel(match[2], match[1]);
    }
    return null;
  }
}
export class ReleaseSlot {
  private user: SlackUser;
  private branch: string;
  constructor(user: SlackUser, branch: string) {
    this.user = user;
    this.branch = branch;
  }

  equals(releaseSlot: ReleaseSlot): boolean {
    return (
      this.user.equals(releaseSlot.user) && this.branch === releaseSlot.branch
    );
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

  indexOf(branch: string): number {
    return this.items.findIndex(
      releaseSlot => releaseSlot.getBranch() === branch
    );
  }

  equals(queue: Queue): boolean {
    if (queue.items.length !== this.items.length) {
      return false;
    }

    return _.zip(queue.items, this.items).every(pairOfItems =>
      pairOfItems[0].equals(pairOfItems[1])
    );
  }
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  toString(): string {
    return JSON.stringify(this.items);
  }
  getReleaseSlots(): ReleaseSlot[] {
    return this.items;
  }

  static deserialize(str: string): Queue {
    const obj = JSON.parse(str);
    const queue: Queue = new Queue();
    queue.items = obj.map(
      itm =>
        new ReleaseSlot(
          new SlackUser(itm.user.username, itm.user.user_id),
          itm.branch
        )
    );
    return queue;
  }

  protected async validate(releaseSlot: ReleaseSlot) {}

  protected insertInItems(
    item: ReleaseSlot,
    releaseSlots: ReleaseSlot[],
    pos: number = -1
  ): ReleaseSlot[] {
    const items = releaseSlots.map(itm => itm.clone());
    if (pos > -1) {
      items.splice(pos, 0, item);
    } else {
      items.push(item);
    }
    return items;
  }

  protected removeFromItems(
    branch: string,
    items: ReleaseSlot[]
  ): ReleaseSlot[] {
    return items.filter(item => item.getBranch() !== branch);
  }

  static isNewTop(before: Queue, after: Queue): boolean {
    if (!after.isEmpty()) {
      if (before.isEmpty()) {
        return true;
      } else {
        const previousFirst: ReleaseSlot = before.getReleaseSlots()[0];
        const currentFirst: ReleaseSlot = after.getReleaseSlots()[0];
        if (!previousFirst.equals(currentFirst)) {
          return true;
        }
      }
    }
    return false;
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

  serialize(): string {
    return JSON.stringify({ items: this.items, channel: this.channel });
  }

  equals(releaseQueue: ReleaseQueue): boolean {
    return super.equals(releaseQueue) && this.channel === releaseQueue.channel;
  }

  protected async validate(releaseSlot: ReleaseSlot) {
    console.log(
      `Validating releaseQueue [${releaseSlot.getBranch()}] [${this.items.map(
        itm => itm.getBranch()
      )}]`
    );
    super.validate(releaseSlot);
    const validation: ValidatorResult = await new CompositeValidator(
      new BranchIsNotInQueueValidator(),
      new BranchHasPrValidator()
    ).validate(this, releaseSlot);

    if (validation.hasErrors()) {
      console.log(`Validation errors ${validation.getErrors()}`);
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
  constructor(
    wrapper: ReleaseQueueDynamoDBWrapper,
    dynamodb,
    tableName,
    queueEventManager?: QueueEventsManager
  ) {
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

  async add(
    releaseSlot: ReleaseSlot,
    pos: number = -1
  ): Promise<DynamoDBReleaseQueue> {
    console.log(`Adding ${releaseSlot.getBranch()} in position ${pos}...`);
    await this.validate(releaseSlot);
    const newQueue = this.clone();
    newQueue.items = this.insertInItems(releaseSlot, this.items, pos);
    await this.updateQueueInDB(newQueue);

    return newQueue;
  }

  async remove(branch: string): Promise<DynamoDBReleaseQueue> {
    console.log(`Removing branch ${branch}...`);
    const newQueue = this.clone();
    newQueue.items = this.removeFromItems(branch, this.items);
    await this.updateQueueInDB(newQueue);
    console.log(`Branch ${branch} removed`);
    return newQueue;
  }

  async move(
    branch: string,
    newPosition: number
  ): Promise<DynamoDBReleaseQueue> {
    console.log(`Moving branch ${branch} to position ${newPosition}...`);
    const newQueue = this.clone();
    const currentPosition = this.indexOf(branch);
    if (currentPosition > -1) {
      const releaseSlotToBeMoved = this.items.find(
        item => item.getBranch() === branch
      );
      if (releaseSlotToBeMoved) {
        const currentPosition = this.items.indexOf(releaseSlotToBeMoved);
        newQueue.items = arrayMove(this.items, currentPosition, newPosition);
        await this.updateQueueInDB(newQueue);
        console.log(`Branch ${branch} moved to ${newPosition}`);
      }
    }
    return newQueue;
  }

  private clone(): DynamoDBReleaseQueue {
    return new DynamoDBReleaseQueue(
      { channel: { S: this.channel } },
      this.dynamodb,
      this.tableName
    );
  }
  private async updateQueueInDB(newQueue: DynamoDBReleaseQueue) {
    console.log(`Updating Queue in DB`);
    if (newQueue.equals(this)) {
      return;
    }
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
    // Only update if value is still the same that was read before.
    expresion["ExpressionAttributeValues"][":oldQ"] = { S: this.serialize() };
    expresion["ConditionExpression"] = "#Q = :oldQ";

    console.log(`Updating Queue in DB: ${this.channel}`);
    await this.dynamodb.updateItem(expresion).promise();

    try {
      console.log(
        `Queue ${
          this.channel
        } changed:\nbeforeL\n${this.toString()}\nafter:\n${newQueue.toString()}`
      );
      await new QueueEventsManager().publishEvent({
        eventType: "QUEUE_CHANGED",
        channel: this.channel,
        before: this.toString(),
        after: newQueue.toString()
      });
    } catch (err) {
      console.error(`Error publishing QueueChangedEvent: ${err}`);
    }
  }
}
