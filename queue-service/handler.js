"use strict";
const AWS = require("aws-sdk");

module.exports.list = async (event, context) => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(processMessage));
  return;
};

async function processMessage(message) {
  const tableName = process.env.dynamoDBQueuesTableName;
  const channel = message.channel_name;
  let dynamoDBOpts = {
    region: process.env.myRegion
  };
  let dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  var params = {
    Key: {
      channel: {
        S: channel
      }
    },
    TableName: tableName
  };

  var item;

  try {
    console.log(`retrieving item: ${JSON.stringify(params)}`);
    item = await dynamodb.getItem(params).promise();
    console.log(`Item retrieved`);
  } catch (err) {
    console.error(`Error retrieving from dynamodb: ${err}`);
  }

  if (item.Item) {
    console.log(`Item: ${JSON.stringify(item)}`);
    const queueJsonString = item.Item["queue"]["S"];
    onSuccessful(message, queueJsonString);
  } else {
    onError(message, "Could not find item");
  }
}

async function onError(message, error) {
  const newMessage = Object.assign(
    { notificationType: "LIST_ERROR", error },
    message
  );
  await publishEvent(prepareEventMessage(newMessage));
}
async function onSuccessful(message, queueJsonString) {
  const newMessage = {
    ...message,
    notificationType: "LIST_SUCCESS",
    queueJsonString
  };
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
