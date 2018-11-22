const handler = require("../handler");
const AWS = require("aws-sdk-mock");

let publishSpy;
beforeEach(() => {
  publishMockFn = () => {};
  AWS.mock("SNS", "publish", function(params, callback) {
    publishSpy = params;
    publishMockFn();
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

test("register returns correct message if no user is provided", async () => {
  const event = {
    body: {
      text: "register",
      response_url: "www.example.com",
      channel_name: "exampleChannel"
    }
  };
  await expect(handler.dispatcher(event)).resolves.toEqual({
    text: "You must provide a user to be registered"
  });
  expect(publishSpy).toBeUndefined;
});

test("register returns correct message in case of error", async () => {
  const event = {
    body: {
      text: "register someone",
      response_url: "www.example.com",
      channel_name: "exampleChannel"
    }
  };
  publishMockFn = () => {
    throw Error();
  };

  await expect(handler.dispatcher(event)).resolves.toEqual({
    text: "Something went wrong"
  });
  expect(publishSpy).toBeUndefined;
});

test("register inserts sns message with correct parameters", async () => {
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
