import { QueueChangedCommand } from "../QueueChangedCommand";
import { CommandResult } from "../Command";
import { CiManager } from "../../managers/CiManager";

export class CIQueueChangedCommand extends QueueChangedCommand {
  protected async executeCmd(): Promise<CommandResult> {
    if (this.isNewTop()) {
      const branchAtTop = this.getAfterQueue()
        .getReleaseSlots()[0]
        .getBranch();
      try {
        console.log(`Triggering pipeline in branch ${branchAtTop}`);
        await new CiManager().triggerPipelineInBranch(
          branchAtTop,
          this.channelStr
        );
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
