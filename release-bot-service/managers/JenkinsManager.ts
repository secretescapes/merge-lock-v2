import { CI_URL } from "../environment";

const axios = require("axios");

export class JenkinsManager {
  async triggerPipelineInBranch(branch: string) {
    const response = await axios.post(
      CI_URL,
      encodeForm({ BRANCH_TO_MERGE: branch }),
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
