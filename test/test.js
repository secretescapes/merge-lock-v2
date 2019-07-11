const chai = require("chai");
const axios = require("axios");
const expect = chai.expect;
const uuidv1 = require("uuid/v1");
require("dotenv").config();
describe("Slack Release Bot", function() {
  describe("list queue", function() {
    it("If there is no queue, returns the proper message", async () => {
      const testId = uuidv1();
      //when: list
      let response = await axios.post(
        `${process.env.TEST_APP_URL}/slack/dispatcher`,
        {
          text: "list",
          response_url: `${
            process.env.RESPONSES_APP_URL
          }/responses/post?id=${testId}`
        }
      );

      //then: it responds OK
      expect(response.status).to.equal(200);
      expect(response.data).to.eql({ text: "OK" });

      //and: a response is sent to the proper URL
      response = await axios.get(
        `${process.env.RESPONSES_APP_URL}/responses/retrieve/${testId}`
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
