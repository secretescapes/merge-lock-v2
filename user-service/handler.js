"use strict";
const AWS = require("aws-sdk");

module.exports.register = async (event, context, callback) => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(processMessage));
  return;
};

async function processMessage(message) {
  const slackUsername = message.slack_user;
  const githubUsername = message.githubUsername;
  const tableName = process.env.dynamoDBUserTableName;

  let dynamoDBOpts = {
    region: process.env.myRegion
  };
  let dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  var params = prepareItem(slackUsername, githubUsername, tableName);

  var error;
  try {
    console.log(`Storing item: ${JSON.stringify(params)}`);
    await dynamodb.putItem(params).promise();
    console.log(`Item stored`);
  } catch (err) {
    console.error(`Error storing to dynamodb: ${err}`);
    error = err;
  }

  try {
    if (error) {
      await onError(message, err);
    } else {
      await onSuccessful(message);
    }
  } catch (err) {
    console.err(`Error sending msg: ${err}`);
  }
}

async function onError(message, error) {
  const newMessage = Object.assign(
    { notificationType: "REGISTER_ERROR", error },
    message
  );
  await publishEvent(prepareEventMessage(newMessage));
}
async function onSuccessful(message) {
  const newMessage = Object.assign(
    { notificationType: "REGISTER_SUCCESS" },
    message
  );
  await publishEvent(prepareEventMessage(newMessage));
}

function prepareEventMessage(messageJson) {
  return {
    Message: JSON.stringify(messageJson),
    TopicArn: process.env.responsesTopicArn
  };
}

// TODO: This can be extracted to a commons module
async function publishEvent(messageData) {
  console.info(`Publising message: ${JSON.stringify(messageData)}`);
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

function prepareItem(slackUsername, githubUsername, tableName) {
  return {
    Item: {
      username: {
        S: `<@${slackUsername.user_id}|${slackUsername.username}>`
      },
      githubUsername: {
        S: githubUsername
      }
    },
    TableName: `${tableName}`
  };
}
