"use strict";
const AWS = require("aws-sdk");

module.exports.dispatcher = async event => {
  console.log(JSON.stringify(event));
  const response_url = event.body.response_url;
  const textArray = event.body.text.split(" ");
  const channel_name = event.body.channel_name;
  const channel_id = event.body.channel_id;
  const slack_user = {
    username: event.body.user_name,
    user_id: event.body.user_id
  };

  const response = await dispatchEvent({
    response_url,
    textArray,
    channel_name,
    slack_user,
    channel_id
  });

  return { text: response };
};

async function dispatchEvent(input) {
  const [command, ...args] = input.textArray;
  switch (command) {
    case "register":
      if (args[0] !== "me") {
        return "Please use /register me [github username]";
      }
      return handleRegisterCommand(args[1], input);
    case "list":
      return handleListCommand(input);
    default:
      return `Unknown command ${command}`;
  }
}

async function handleListCommand(input) {
  let messageData = prepareEventMessage(input, process.env.listTopicArn);
  try {
    await publishEvent(messageData);
    return `fetching queue for <#${input.channel_id}|${input.channel_name}>`;
  } catch (err) {
    console.error(JSON.stringify(err));
    return "Something went wrong";
  }
}

async function handleRegisterCommand(githubUsername, input) {
  if (githubUsername === undefined) {
    return "You must provide a user to be registered";
  }
  let messageData = prepareEventMessage(
    { ...input, githubUsername },
    process.env.registerTopicArn
  );
  console.info("publishing message:", messageData);
  try {
    await publishEvent(messageData);
    return "Registering user";
  } catch (err) {
    console.error(JSON.stringify(err));
    return "Something went wrong";
  }
}

function prepareEventMessage(messageJson, topic) {
  return {
    Message: JSON.stringify(messageJson),
    TopicArn: topic
  };
}

// TODO: This can be extracted to a commons module
async function publishEvent(messageData) {
  let snsOpts = {
    region: process.env.myRegion
  };
  let sns = new AWS.SNS(snsOpts);
  try {
    await sns.publish(messageData).promise();
    console.info("message published");
  } catch (err) {
    console.error(JSON.stringify(err));
    throw new Error("Error publishing event");
  }
}
