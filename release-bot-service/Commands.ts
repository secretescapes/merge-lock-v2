import {
  SlackUser,
  DynamoDBReleaseQueue,
  ReleaseSlot,
  SlackChannel
} from "./Queues";
import { DynamoDBQueueManager, DynamoDBUserManager } from "./Managers";
import { SlackFormatter } from "./Formatter";

const QUEUES_TABLE_NAME = process.env.dynamoDBQueueTableName || "";
const USERS_TABLE_NAME = process.env.dynamoDBUserTableName || "";
const REGION = process.env.myRegion || "";

class Body {
  token: string;
  team_id: string;
  team_domain: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name: string;
  command: string;
  text: string;
  response_url: string;
}

export class CommandResult {
  success: boolean;
  reason?: string;
  result: string;
}
export abstract class Command {
  async execute(): Promise<CommandResult> {
    const valid = this.validate();
    if (valid === true) {
      return await this.executeCmd();
    } else {
      return { success: false, result: valid };
    }
  }
  protected abstract async executeCmd(): Promise<CommandResult>;
  protected abstract validate(): true | string;
}

class RegisterUserCommand extends Command {
  private user: SlackUser | null;
  private githubUsername: string | null;
  constructor(user: SlackUser | null, githubUsername: string | null) {
    super();
    this.user = user;
    this.githubUsername = githubUsername;
  }
  protected async executeCmd(): Promise<CommandResult> {
    try {
      if (!this.user || !this.githubUsername) {
        return { success: false, result: "Missing params" };
      }
      await new DynamoDBUserManager(USERS_TABLE_NAME, REGION).updateUser(
        this.user,
        this.githubUsername
      );
      return { success: true, result: `User registered` };
    } catch (err) {
      console.error(`Error registering user: ${err}`);
      return { success: false, result: `Error registering user` };
    }
  }
  validate(): string | true {
    if (!this.user) {
      return `Please, provide a valid user`;
    }
    if (!this.githubUsername) {
      return `Please, provide a valid github username`;
    }
    return true;
  }
}
class addToQueueCommand extends Command {
  private user: SlackUser | null;
  private branch: string | null;
  private channel: SlackChannel;

  constructor(
    user: SlackUser | null,
    branch: string | null,
    channel: SlackChannel
  ) {
    super();
    this.user = user;
    this.branch = branch;
    this.channel = channel;
  }

  validate(): string | true {
    if (!this.user) {
      return "Please, provide a valid user";
    }
    if (!this.branch) {
      return "Please, provide a valid branch";
    }
    return true;
  }

  async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
    try {
      const queue: DynamoDBReleaseQueue = await dynamoDBManager.getQueue(
        this.channel.toString()
      );
      if (!this.user || !this.branch) {
        return { success: false, result: `Missing params` };
      }
      const newQueue = await queue.add(new ReleaseSlot(this.user, this.branch));
      return {
        success: true,
        result: `Added, here is the queue:\n${new SlackFormatter().format(
          newQueue
        )}`
      };
    } catch (err) {
      console.error(`Error adding to Queue ${this.channel}: ${err}`);
      //TODO: Check for validation errors
      return {
        success: false,
        result: `Error adding to Queue ${this.channel}`
      };
    }
  }
}

class createQueueCommand extends Command {
  private channel: SlackChannel;
  constructor(channel: SlackChannel) {
    super();
    this.channel = channel;
  }
  protected async executeCmd(): Promise<CommandResult> {
    const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
    try {
      await dynamoDBManager.createQueue(this.channel.toString());
      return { success: true, result: `Queue has been created` };
    } catch (err) {
      console.log(`ERROR: ${err.toString()}`);
      if (err.toString().indexOf("QueryAlreadyExists") > -1) {
        return {
          success: false,
          result: `There is already a queue on this channel`
        };
      }
      return { success: false, result: `Error creating queue` };
    }
  }
  validate(): string | true {
    return true;
  }
}
class ListCommand extends Command {
  private channel: SlackChannel;
  validate(): string | true {
    return true;
  }
  constructor(channel: SlackChannel) {
    super();
    this.channel = channel;
  }
  async executeCmd(): Promise<CommandResult> {
    try {
      const queue = await new DynamoDBQueueManager(
        QUEUES_TABLE_NAME,
        REGION
      ).getQueue(this.channel.toString());
      return { success: true, result: new SlackFormatter().format(queue) };
    } catch (err) {
      console.error(`Error retrieving from dynamodb: ${err}`);
      return { success: false, result: `Error retriving queue` };
    }
  }
}

class UnknowCommand extends Command {
  validate(): string | true {
    return "Unkown command";
  }
  constructor() {
    super();
  }
  executeCmd(): Promise<CommandResult> {
    throw new Error("Method not implemented.");
  }
}

export class SlackCommandFactory {
  buildCommand(body: Body): Command {
    const [command, ...args] = body.text.split(" ");
    switch (command) {
      case "list":
        return new ListCommand(
          new SlackChannel(body.channel_name, body.channel_id)
        );
      case "add":
        return new addToQueueCommand(
          this.resolveUser(args[0], body.user_id, body.user_name),
          args[1],
          new SlackChannel(body.channel_name, body.channel_id)
        );
      case "register":
        return new RegisterUserCommand(
          this.resolveUser(args[0], body.user_id, body.user_name),
          args[1]
        );
      case "create":
        return new createQueueCommand(
          new SlackChannel(body.channel_name, body.channel_id)
        );

      default:
        return new UnknowCommand();
    }
  }

  private resolveUser(arg, invokerUserId, invokerUserName): SlackUser | null {
    if (arg.toLowerCase() === "me") {
      return new SlackUser(invokerUserName, invokerUserId);
    } else {
      const regex = /<@([a-z,A-Z,0-9]{9})\|([\w\.]+)>/g;
      const match = regex.exec(arg);
      if (!match || match.length < 3) {
        return null;
      }
      return new SlackUser(match[2], match[1]);
    }
  }
}
