import { SlackUser } from "../Queues";
import { DynamoDBUserManager } from "../Managers";
import { Command, CommandResult, USERS_TABLE_NAME, REGION } from "./Command";
export class RegisterUserCommand extends Command {
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
