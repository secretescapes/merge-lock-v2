import { QueueChangedCommand } from "../QueueChangedCommand";
import { CommandResult } from "../Command";
import { JenkinsManager } from "../../managers/JenkinsManager";

export class JenkinsQueueChangedCommand extends QueueChangedCommand {
  protected async executeCmd(): Promise<CommandResult> {
    if (this.isNewTop()) {
      const branchAtTop = this.getAfterQueue()
        .getReleaseSlots()[0]
        .getBranch();
      try {
        await new JenkinsManager().triggerPipelineInBranch(branchAtTop);
      } catch (err) {
        console.error(`Error sending request to Jenkins ${err}`);
        return {
          success: false,
          result: `Error sending request to Jenkins ${err}`
        };
      }
    }
    return { success: true, result: "" };
  }
}
