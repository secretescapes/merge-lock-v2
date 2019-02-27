"use strict";
const AWS = require("aws-sdk");
const axios = require("axios");
import { SlackFormatter } from "./Formatter";
import {
  ReleaseQueue,
  DynamoDBReleaseQueue,
  SlackUser,
  ReleseSlot,
  DynamoDBManager
} from "./ReleaseQueue";

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
  //TODO: THis could call a function that checks different conditions that
  // need to be met before being able to enter the QUEUE (PR approved, Test passing, etc...)
  const preAddConditionsCheck = { pass: true, reasons: [] };
  if (!preAddConditionsCheck.pass) {
    //TODO
    return "Preconditions not met";
  }
  const addFunction = (user, branch) => queue =>
    addToQueue(queue, new ReleseSlot(user, branch));

  return updateQueue(channel, addFunction(user, branch));
}

/**
 *
 * @param {string} channel Queue to be updated
 * @param {(queue)=> queue} operation function that takes an existing queue and returns a modified queue
 */
async function updateQueue(channel, operation: (queue) => ReleaseQueue) {
  //TODO: Modify this function so it just returns the new status of the queue, an exception
  try {
    // GET LOCK
    if (!(await acquireLockForQueue(channel))) {
      return `Could not get the lock, try again.`;
    }
    // READ QUEUE
    const queue: ReleaseQueue = await new DynamoDBManager(
      TABLE_NAME,
      REGION
    ).getQueue(channel);
    console.log(`Queue retrieved: ${JSON.stringify(queue)}`);

    // MODIFY QUEUE
    const newQueue = operation(queue);

    console.log(`new Queue: ${JSON.stringify(newQueue)}`);
    //TODO: VALIDATE QUEUE (no dups)
    //SAVE QUEUE
    await updateQueueInDB(
      prepareUpdateQueueItem(channel, JSON.stringify(newQueue))
    );
    const f = new SlackFormatter();
    return `Here is the queue:\n${f.format(newQueue)}`;
  } catch (err) {
    console.log(`Error updating queue: ${err}`);
    return `Error updating the queue`;
  } finally {
    //RELEASE LOCK
    await releaseLockForQueue(channel);
  }
}

function addToQueue(
  queue: ReleaseQueue,
  newItem: ReleseSlot,
  position = -1
): ReleaseQueue {
  return queue.add(newItem);
}

async function updateQueueInDB(params) {
  const dynamoDBOpts = {
    region: process.env.myRegion
  };
  const dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  try {
    console.log(`Updating queue`);
    await dynamodb.updateItem(params).promise();
    console.log(`Queue updated`);
  } catch (err) {
    console.log(`Error updating: ${err}`);
  }
}

async function releaseLockForQueue(channel) {
  const tableName = process.env.dynamoDBQueueTableName;
  const dynamoDBOpts = {
    region: process.env.myRegion
  };
  const dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  const params = prepareReleaseLockItem(channel, tableName);
  try {
    console.log(`Releasing lock for ${channel}`);
    await dynamodb.updateItem(params).promise();
    console.log(`Lock Released for ${channel}`);
  } catch (err) {
    console.log(`Error releasing lock for ${channel}: ${err}`);
  }
}

function prepareUpdateQueueItem(channel, queueString) {
  return {
    ExpressionAttributeNames: {
      "#Q": "queue"
    },
    ExpressionAttributeValues: {
      ":q": { S: queueString }
    },
    Key: {
      channel: {
        S: channel
      }
    },
    TableName: process.env.dynamoDBQueueTableName,
    UpdateExpression: "SET #Q = :q"
  };
}

function prepareReleaseLockItem(channel, tableName) {
  return {
    ExpressionAttributeNames: {
      "#L": "lock"
    },
    ExpressionAttributeValues: {
      ":l": { N: "0" }
    },
    Key: {
      channel: {
        S: channel
      }
    },
    TableName: `${tableName}`,
    UpdateExpression: "SET #L = :l"
  };
}

async function acquireLockForQueue(channel) {
  let lockAcquired = false;
  const tableName = process.env.dynamoDBQueueTableName;
  const dynamoDBOpts = {
    region: process.env.myRegion
  };
  const dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  const params = prepareAcquireLockItem(channel, tableName);
  try {
    console.log(`Acquiring lock for ${channel}`);
    await dynamodb.updateItem(params).promise();
    lockAcquired = true;
    console.log(`Lock acquired for ${channel}`);
  } catch (err) {
    console.log(`Error acquiring lock for ${channel}: ${err}`);
  }
  return lockAcquired;
}

function prepareAcquireLockItem(channel, tableName) {
  return {
    ExpressionAttributeNames: {
      "#L": "lock"
    },
    ExpressionAttributeValues: {
      ":l": { N: "1" }
    },
    Key: {
      channel: {
        S: channel
      }
    },
    ConditionExpression: "#L <> :l",
    TableName: `${tableName}`,
    UpdateExpression: "SET #L = :l"
  };
}

async function handleCreateCommand(channel) {
  const tableName = process.env.dynamoDBQueueTableName;
  let dynamoDBOpts = {
    region: process.env.myRegion
  };
  let dynamodb = new AWS.DynamoDB(dynamoDBOpts);
  var params = prepareQueueItem(channel, tableName);

  try {
    console.log(`Storing item: ${JSON.stringify(params)}`);
    await dynamodb.putItem(params).promise();
    console.log(`Item stored`);
    return `Queue created`;
  } catch (err) {
    if (err.toString().startsWith("ConditionalCheckFailedException")) {
      console.error(`Queue already exists: ${err}`);
      return `There is already a queue on this channel`;
    }
    console.error(`Error storing to dynamodb: ${err}`);
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

function prepareQueueItem(channel, tableName) {
  return {
    Item: {
      channel: {
        S: channel
      }
    },
    ConditionExpression: "attribute_not_exists(channel)",
    TableName: `${tableName}`
  };
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

async function handleListCommand(channel) {
  try {
    const queue = await new DynamoDBManager(TABLE_NAME, REGION).getQueue(
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
