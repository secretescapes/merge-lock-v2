const chai = require("chai");
const axios = require("axios");
const expect = chai.expect;
const uuidv1 = require("uuid/v1");
describe("Slack Release Bot", function() {
  describe("list queue", function() {
    it("If there is no queue, returns the proper message", async () => {
      const testId = uuidv1();
      //when: list
      let response = await axios.post(
        "https://ey9r6pxe20.execute-api.us-east-1.amazonaws.com/test/slack/dispatcher",
        {
          text: "list",
          response_url: `https://0tx8rkovb0.execute-api.us-east-1.amazonaws.com/dev/responses/post?id=${testId}`
        }
      );

      //then: it responds OK
      expect(response.status).to.equal(200);
      expect(response.data).to.eql({ text: "OK" });

      //and: a response is sent to the proper URL
      response = await axios.get(
        `https://0tx8rkovb0.execute-api.us-east-1.amazonaws.com/dev/responses/retrieve/${testId}`
      );
      const responses = JSON.parse(response.data.body);
      expect(responses.length).to.equal(1);
      //and: the message is correct
      expect(JSON.parse(responses[0].body)).to.eql({
        text: "Error retriving queue"
      });
    });
  });
});
