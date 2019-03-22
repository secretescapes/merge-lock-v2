const axios = require("axios");
export class ResponseManager {
  async postResponse(url: string, text: string) {
    console.log(`Posting response...`);
    try {
      await axios.post(url, { text });
      console.info("Response sent");
    } catch (error) {
      console.error(`Error sending response: ${error}`);
    }
  }
}
