const axios = require("axios");
const FormData = require("form-data");
export class JenkinsManager {
  async triggerPipelineInBranch(branch: string) {
    const data = new FormData();
    data.append("BRANCH_TO_MERGE", branch);
    await axios.post(
      `http://jenkins.secretescapes.com:9090/buildByToken/buildWithParameters?token=${"IB8beAjMKx1hAfuj6pL6mO0XPWSrzMG2vYM6VdejRBrQMFicvNIrCG2TYSDKkici"}&job=merge-to-master`,
      data,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    console.info("Request to jenkins sent");
  }
}
