"use strict";
const AWS = require("aws-sdk");
const axios = require("axios");
import { SlackFormatter } from "./Formatter";
import { DynamoDBReleaseQueue, SlackUser, ReleaseSlot } from "./Queues";
import { DynamoDBQueueManager } from "./Managers";

const TABLE_NAME = process.env.dynamoDBQueueTableName || "";
const REGION = process.env.myRegion || "";

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
  const formatChannel = (channel_id, channel_name) =>
    `<#${channel_id}|${channel_name}>`;

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
      response = await handleListCommand(
        formatChannel(channel_id, channel_name)
      );
      await postNotification(response_url, response);
      break;
    case "add":
      if (!args[0] || !args[1]) {
        await postNotification(
          response_url,
          "Please use /add [user] [branch name]"
        );
      } else {
        const user = resolveUser(args[0], user_id, user_name);
        if (!user) {
          await postNotification(response_url, "User not recognized");
        } else {
          response = await handleAddCommand(
            user,
            formatChannel(channel_id, channel_name),
            args[1]
          );
          await postNotification(response_url, response);
        }
      }

      break;
    case "create":
      response = await handleCreateCommand(
        formatChannel(channel_id, channel_name)
      );
      await postNotification(response_url, response);
      break;
    default:
      await postNotification(response_url, `Unknown command ${command}`);
      console.log(`Unknown command ${command}`);
      break;
    // return `Unknown command ${command}`;
  }
}

function resolveUser(
  param,
  requester_user_id,
  requester_user_name
): SlackUser | null {
  if (param.toLowerCase() === "me") {
    return new SlackUser(requester_user_name, requester_user_id);
  } else {
    const regex = /<@([a-z,A-Z,0-9]{9})\|([\w\.]+)>/g;
    const match = regex.exec(param);
    if (!match || match.length < 3) {
      return null;
    }
    return new SlackUser(match[2], match[1]);
  }
}

async function handleAddCommand(
  user: SlackUser,
  channel: string,
  branch: string
) {
  const dynamoDBManager = new DynamoDBQueueManager(TABLE_NAME, REGION);
  try {
    const queue: DynamoDBReleaseQueue = await dynamoDBManager.getQueue(channel);
    const newQueue = await queue.add(new ReleaseSlot(user, branch));
    return `Added, here is the queue:\n${new SlackFormatter().format(
      newQueue
    )}`;
  } catch (err) {
    console.error(`Error adding to Queue ${channel}: ${err}`);
    //TODO: Check for validation errors
  }

  return `Something went wrong :/`;
}

async function handleCreateCommand(channel: string): Promise<string> {
  const dynamoDBManager = new DynamoDBQueueManager(TABLE_NAME, REGION);
  try {
    await dynamoDBManager.createQueue(channel);
    return `Queue has been created`;
  } catch (err) {
    console.log(`ERROR: ${err.toString()}`);
    if (err.toString().indexOf("QueryAlreadyExists") > -1) {
      return `There is already a queue on this channel`;
    }
    return `Error creating queue`;
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

async function handleListCommand(channel): Promise<string> {
  try {
    const queue = await new DynamoDBQueueManager(TABLE_NAME, REGION).getQueue(
      channel
    );
    return new SlackFormatter().format(queue);
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
