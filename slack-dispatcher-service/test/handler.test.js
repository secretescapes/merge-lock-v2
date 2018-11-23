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
      channel_name: "exampleChannel",
      user_id: "user_id",
      user_name: "user_name"
    }
  };
  await expect(handler.dispatcher(event)).resolves.toEqual({
    text: "Unknown command unknownCommand"
  });
});

test("register returns correct message if format is not /register me [github username]", async () => {
  const event = {
    body: {
      text: "register",
      response_url: "www.example.com",
      channel_name: "exampleChannel",
      user_id: "user_id",
      user_name: "user_name"
    }
  };
  await expect(handler.dispatcher(event)).resolves.toEqual({
    text: "Please use /register me [github username]"
  });
  expect(publishSpy).toBeUndefined;
});

test("register returns correct message if no user is provided", async () => {
  const event = {
    body: {
      text: "register me",
      response_url: "www.example.com",
      channel_name: "exampleChannel",
      user_id: "user_id",
      user_name: "user_name"
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
      text: "register me someone",
      response_url: "www.example.com",
      channel_name: "exampleChannel",
      user_id: "user_id",
      user_name: "user_name"
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
      text: "register me someUser",
      response_url: "www.example.com",
      channel_name: "exampleChannel",
      user_id: "user_id",
      user_name: "user_name"
    }
  };

  await expect(handler.dispatcher(event)).resolves.toEqual({
    text: "Registering user"
  });
  expect(publishSpy).toEqual({
    Message:
      '{"response_url":"www.example.com","textArray":["register","me","someUser"],"channel_name":"exampleChannel","slack_user":{"username":"user_name","user_id":"user_id"},"githubUsername":"someUser"}',
    TopicArn: undefined
  });
});
