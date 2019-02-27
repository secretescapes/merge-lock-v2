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
export class ReleseSlot {
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

  clone(): ReleseSlot {
    return new ReleseSlot(this.user.clone(), this.branch);
  }
}
export class Queue {
  protected items: ReleseSlot[];

  constructor() {
    this.items = [];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  getReleaseSlots(): ReleseSlot[] {
    return this.items;
  }

  add(item: ReleseSlot): Queue {
    const queue = new Queue();
    queue.items = this.items.map(itm => itm.clone());
    queue.items.push(item);
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

  add(releaseSlot: ReleseSlot): ReleaseQueue {
    const q = super.add(releaseSlot);
    const rq: ReleaseQueue = q as ReleaseQueue;
    rq.channel = this.channel;
    return rq;
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
        new ReleseSlot(
          new SlackUser(wrapper.user.username, wrapper.user.user_id),
          wrapper.branch
        )
    );
  }
}
