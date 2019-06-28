export class CommandResult {
  success: boolean;
  reason?: string;
  result: string;

  static SUCCESS: CommandResult = { success: true, result: "" };
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

export class UnknowCommand extends Command {
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
