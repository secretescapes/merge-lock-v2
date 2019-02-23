export class SlackUser {
  username: string;
  user_id: string;

  constructor(username: string, userId: string) {
    this.username = username;
    this.user_id = userId;
  }
}
class Item {
  user: SlackUser;
  branch: string;
  constructor(user: SlackUser, branch: string) {
    this.user = user;
    this.branch = branch;
  }
}
class Queue {
  items: Array<Item>;
  constructor(items?: []) {
    this.items = items || [];
  }
  isEmpty(): boolean {
    return this.items.length == 0;
  }
}
export class ReleaseQueue {
  channel: string;
  queue: Queue;

  constructor(channel: string, queue?: []) {
    this.channel = channel;
    this.queue = new Queue(queue);
  }
}
