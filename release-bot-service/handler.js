"use strict";
const AWS = require("aws-sdk");
const axios = require("axios");

module.exports.server = async event => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(processMessage));
  return;
};

module.exports.dispatcher = async event => {
  console.log(JSON.stringify(event));
  await publishEvent(prepareEventMessage(event, process.env.commandTopicArn));

  return { text: "OK" };
};

async function processMessage(message) {
  const {
    team_id,
    channel_id,
    channel_name,
    user_id,
    user_name,
    text,
    response_url
  } = message.body;

  const [command, ...args] = text.split(" ");
  let response;
  switch (command) {
    case "register":
      if (args[0] !== "me") {
        await postNotification(
          response_url,
          "Please use /register me [github username]"
        );
        return;
      }
      response = await handleRegisterCommand(user_id, user_name, args[1]);
      await postNotification(response_url, response);
      break;
    case "list":
      response = await handleListCommand(channel_name);
      await postNotification(response_url, response);
      break;
    default:
      await postNotification(response_url, `Unknown command ${command}`);
      console.log(`Unknown command ${command}`);
      break;
    // return `Unknown command ${command}`;
  }
}

async function handleRegisterCommand(user_id, user_name, githubUsername) {
  const tableName = process.env.dynamoDBUserTableName;

  let dynamoDBOpts = {
    region: process.env.myRegion
  };
  let dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  var params = prepareUserItem(user_id, user_name, githubUsername, tableName);

  try {
    console.log(`Storing item: ${JSON.stringify(params)}`);
    await dynamodb.putItem(params).promise();
    console.log(`Item stored`);
    return `User registered`;
  } catch (err) {
    console.error(`Error storing to dynamodb: ${err}`);
    return `Error registering user`;
  }
}
function prepareUserItem(user_id, username, githubUsername, tableName) {
  return {
    Item: {
      username: {
        S: `<@${user_id}|${username}>`
      },
      githubUsername: {
        S: githubUsername
      }
    },
    TableName: `${tableName}`
  };
}

async function handleListCommand(channel_name) {
  const tableName = process.env.dynamoDBQueueTableName;
  let dynamoDBOpts = {
    region: process.env.myRegion
  };
  let dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  var params = {
    Key: {
      channel: {
        S: channel_name
      }
    },
    TableName: tableName
  };

  var item;

  try {
    console.log(`retrieving item: ${JSON.stringify(params)}`);
    item = await dynamodb.getItem(params).promise();
    console.log(`Item retrieved: ${JSON.stringify(item)}`);
    if (item.Item) {
      const queueJsonString = item.Item["queue"]["S"];
      //TODO
      return formatQueue(queueJsonString);
    } else {
      return `Couldn't find a queue for this channel`;
    }
  } catch (err) {
    console.error(`Error retrieving from dynamodb: ${err}`);
    return `Error retriving queue`;
  }
}

function prepareEventMessage(messageJson, topic) {
  return {
    Message: JSON.stringify(messageJson),
    TopicArn: topic
  };
}

function formatQueue(queueJsonString) {
  const formatSlackUser = slackUser =>
    `<@${slackUser.user_id}|${slackUser.username}>`;

  return JSON.parse(queueJsonString)
    .queue.map(entry => `${formatSlackUser(entry.user)} *${entry.branch}*`)
    .reduce(
      (accumulator, currentValue, currentIndex) =>
        `${accumulator}${currentIndex === 0 ? "" : "\n"}${currentIndex +
          1}.- ${currentValue}`,
      ""
    );
}

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

async function postNotification(url, text) {
  try {
    await axios.post(url, { text });
    console.info("Response sent");
  } catch (error) {
    console.error(error);
  }
}
