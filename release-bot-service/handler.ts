"use strict";
import { SlackFormatter } from "./Formatter";
import { DynamoDBReleaseQueue, SlackUser, ReleaseSlot } from "./Queues";
import {
  DynamoDBQueueManager,
  DynamoDBUserManager,
  ResponseManager,
  CommandEventManager
} from "./Managers";
import { SlackCommandFactory, Command, CommandResult } from "./Commands";

const QUEUES_TABLE_NAME = process.env.dynamoDBQueueTableName || "";
const USERS_TABLE_NAME = process.env.dynamoDBUserTableName || "";
const REGION = process.env.myRegion || "";
const COMMAND_TOPIC = process.env.commandTopicArn || "";

module.exports.server = async event => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(processMessage));
  return;
};

module.exports.dispatcher = async event => {
  console.log(JSON.stringify(event));
  try {
    await new CommandEventManager(REGION, COMMAND_TOPIC).publish(
      JSON.stringify(event)
    );
  } catch (err) {
    return { text: "Something went wrong" };
  }
  return { text: "OK" };
};

async function processMessage(message) {
  const command: Command = new SlackCommandFactory().buildCommand(message.body);
  const result: CommandResult = await command.execute();
  await new ResponseManager().postResponse(
    message.body.response_url,
    result.result
  );

  // const formatChannel = (channel_id, channel_name) =>
  //   `<#${channel_id}|${channel_name}>`;

  // const {
  //   team_id,
  //   channel_id,
  //   channel_name,
  //   user_id,
  //   user_name,
  //   text,
  //   response_url
  // } = message.body;

  // const responseManager = new ResponseManager();

  // const [command, ...args] = text.split(" ");
  // let response;
  // switch (command) {
  //   case "register":
  //     if (args[0] !== "me") {
  //       await responseManager.postResponse(
  //         response_url,
  //         "Please use /register me [github username]"
  //       );
  //       return;
  //     }
  //     response = await handleRegisterCommand(user_id, user_name, args[1]);
  //     await responseManager.postResponse(response_url, response);
  //     break;
  //   case "list":
  //     response = await handleListCommand(
  //       formatChannel(channel_id, channel_name)
  //     );
  //     await responseManager.postResponse(response_url, response);
  //     break;
  //   case "add":
  //     if (!args[0] || !args[1]) {
  //       await responseManager.postResponse(
  //         response_url,
  //         "Please use /add [user] [branch name]"
  //       );
  //     } else {
  //       const user = resolveUser(args[0], user_id, user_name);
  //       if (!user) {
  //         await responseManager.postResponse(
  //           response_url,
  //           "User not recognized"
  //         );
  //       } else {
  //         response = await handleAddCommand(
  //           user,
  //           formatChannel(channel_id, channel_name),
  //           args[1]
  //         );
  //         await responseManager.postResponse(response_url, response);
  //       }
  //     }

  //     break;
  //   case "create":
  //     response = await handleCreateCommand(
  //       formatChannel(channel_id, channel_name)
  //     );
  //     await responseManager.postResponse(response_url, response);
  //     break;
  //   default:
  //     await responseManager.postResponse(
  //       response_url,
  //       `Unknown command ${command}`
  //     );
  //     console.log(`Unknown command ${command}`);
  //     break;
  //   // return `Unknown command ${command}`;
  // }
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
  const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
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
  const dynamoDBManager = new DynamoDBQueueManager(QUEUES_TABLE_NAME, REGION);
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
  try {
    new DynamoDBUserManager(USERS_TABLE_NAME, REGION).updateUser(
      new SlackUser(user_name, user_id),
      githubUsername
    );
    return `User registered`;
  } catch (err) {
    return `Error registering user`;
  }
}

async function handleListCommand(channel): Promise<string> {
  try {
    const queue = await new DynamoDBQueueManager(
      QUEUES_TABLE_NAME,
      REGION
    ).getQueue(channel);
    return new SlackFormatter().format(queue);
  } catch (err) {
    console.error(`Error retrieving from dynamodb: ${err}`);
    return `Error retriving queue`;
  }
}
