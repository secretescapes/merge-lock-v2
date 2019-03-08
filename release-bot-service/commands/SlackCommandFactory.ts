import { SlackUser, SlackChannel } from "../Queues";
import { Command, UnknowCommand } from "./Command";
import { RegisterUserCommand } from "./RegisterUserCommand";
import { addToQueueCommand } from "./addToQueueCommand";
import { createQueueCommand } from "./createQueueCommand";
import { ListCommand } from "./ListCommand";

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
