const axios = require("axios");

export type SlackRichResponse = {
  url: string;
  title: string;
  text: string;
  color: "danger" | "good" | null;
};
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

  async postRichResponse(response: SlackRichResponse) {
    try {
      const payload = {
        attachments: [
          { title: response.title, text: response.text, color: response.color }
        ]
      };
      await axios.post(response.url, payload);
      console.info("Response sent");
    } catch (error) {
      console.error(`Error sending response: ${error}`);
    }
  }
}
