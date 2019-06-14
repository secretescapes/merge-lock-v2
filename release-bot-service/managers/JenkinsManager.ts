import { CI_STATUS_UPDATE_URL } from "../environment";
import { DynamoDBQueueManager } from "./dynamoDBManagers/DynamoDBQueueManager";

const axios = require("axios");

export class JenkinsManager {
  async triggerPipelineInBranch(branch: string, channel: string) {
    const ciUrlForChannel = await new DynamoDBQueueManager().getCiUrlForChannel(
      channel
    );
    console.log(`URL RETURNED ${unescape(ciUrlForChannel || "")}`);
    if (!ciUrlForChannel) throw new Error("Empty CI URL for branch ${branch}");
    const response = await axios.post(
      unescape(ciUrlForChannel),
      encodeForm({
        BRANCH_TO_MERGE: branch,
        NOTIFICATION_ENDPOINT: `${CI_STATUS_UPDATE_URL.trim()}`
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    console.info(`Request to jenkins sent ${JSON.stringify(response.data)}`);
  }
}

const encodeForm = data => {
  return Object.keys(data)
    .map(key => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
};
