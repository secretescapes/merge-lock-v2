const handler = require("../handler");
const AWS = require("aws-sdk-mock");

let publishSpy;

beforeEach(() => {
  AWS.mock("SNS", "publish", function(params, callback) {
    publishSpy = params;
    callback(null, "published");
  });
});

test("dispatcher returns correct message if command is not recognized", async () => {
  const event = {
    body: {
      text: "unknownCommand text",
      response_url: "www.example.com",
      channel_name: "exampleChannel"
    }
  };
  await expect(handler.dispatcher(event)).resolves.toEqual({
    text: "Unknown command unknownCommand"
  });
});

test("dispatcher inserts sns message with correct parameters", async () => {
  const event = {
    body: {
      text: "register someUser",
      response_url: "www.example.com",
      channel_name: "exampleChannel"
    }
  };

  await expect(handler.dispatcher(event)).resolves.toEqual({
    text: "Registering user"
  });
  expect(publishSpy).toEqual({
    Message:
      '{"response_url":"www.example.com","textArray":["register","someUser"],"channel_name":"exampleChannel","userToRegister":"someUser"}',
    TopicArn: undefined
  });
});
