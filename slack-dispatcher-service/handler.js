"use strict";
const AWS = require("aws-sdk");

module.exports.dispatcher = async event => {
  console.log(JSON.stringify(event));
  const response_url = event.body.response_url;
  const textArray = event.body.text.split(" ");
  const channel_name = event.body.channel_name;

  const response = await dispatchEvent({
    response_url,
    textArray,
    channel_name
  });

  return { text: response };
};

async function dispatchEvent(input) {
  const [command, ...args] = input.textArray;
  switch (command) {
    case "register":
      return handleRegisterCommand(args[0], input);
    default:
      return `unknown command ${command}`;
  }
}

async function handleRegisterCommand(userToRegister, input) {
  if (userToRegister === undefined) {
    return "you must provide a user to be registered";
  }
  let messageData = prepareEventMessage({ ...input, userToRegister });
  console.info("publishing message:", messageData);
  try {
    await publishEvent(messageData);
    return "Registering user";
  } catch (err) {
    console.error(JSON.stringify(err));
    return "Something went wrong";
  }
}

function prepareEventMessage(messageJson) {
  return {
    Message: JSON.stringify(messageJson),
    TopicArn: process.env.mySnsTopicArn
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
