import { SlackUser, SlackChannel } from "../../Queues";
import { Command, UnknowCommand } from "../Command";
import { RegisterUserCommand } from "../usersCommands/RegisterUserCommand";
import { addToQueueCommand } from "../queueCommands/addToQueueCommand";
import { CreateQueueCommand } from "../queueCommands/CreateQueueCommand";
import { ListCommand } from "../queueCommands/ListCommand";
import { RemoveFromQueueCommand } from "../queueCommands/RemoveFromQueueCommand";
import { CommandFactory } from "./CommandFactory";
import { MoveInQueueCommand } from "../queueCommands/MoveInQueueCommand";
const decode = require("decode-html");

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

export class SlackCommandFactory implements CommandFactory {
  async buildCommand(body: Body): Promise<Command> {
    const [command, ...args] = body.text.split(" ");
    switch (command) {
      case "list":
        //list
        return new ListCommand(
          new SlackChannel(body.channel_name, body.channel_id)
        );
      case "add":
        // add ['me' | user] [branch] [position?]
        return new addToQueueCommand(
          this.resolveUser(args[0], body.user_id, body.user_name),
          args[1],
          new SlackChannel(body.channel_name, body.channel_id),
          args.length > 2 ? this.sanitizePosition(args[2]) : undefined
        );
      case "register":
        //register ['me' | user] [githubUsername]
        return new RegisterUserCommand(
          this.resolveUser(args[0], body.user_id, body.user_name),
          args[1]
        );
      case "create":
        //create [repo] [slack webhook] [ci url]
        return new CreateQueueCommand(
          new SlackChannel(body.channel_name, body.channel_id),
          args[0],
          this.sanitizeSlackUrl(args[1]),
          this.sanitizeSlackUrl(args[2])
        );
      case "remove":
        //remove [branch]
        return new RemoveFromQueueCommand(
          args[0],
          new SlackChannel(body.channel_name, body.channel_id)
        );
      case "move":
        //move [branch] [position]
        return new MoveInQueueCommand(
          args[0],
          new SlackChannel(body.channel_name, body.channel_id),
          this.sanitizePosition(args[1]) || null
        );
      case "back":
        // back [branch]
        return new MoveInQueueCommand(
          args[0],
          new SlackChannel(body.channel_name, body.channel_id),
          "BACK"
        );
      default:
        return new UnknowCommand();
    }
  }

  private sanitizePosition(str: string): number | undefined {
    return parseInt(str) != NaN ? parseInt(str) : undefined;
  }
  private sanitizeSlackUrl(url: string) {
    return decode(url.replace(/[\<\>]/g, ""));
  }

  private resolveUser(arg, invokerUserId, invokerUserName): SlackUser | null {
    if (arg.toLowerCase() === "me") {
      return new SlackUser(invokerUserName, invokerUserId);
    } else {
      return SlackUser.parseFromString(arg);
    }
  }
}
