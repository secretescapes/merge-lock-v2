"use strict";

import {
  ResponseManager,
  CommandEventsManager,
  PrEvent,
  GithubEvent,
  GithubEventsManager,
  DynamoDBQueueManager
} from "./Managers";
import { Command, CommandResult } from "./commands/Command";
import { SlackCommandFactory } from "./commands/SlackCommandFactory";
import { DynamoDBReleaseQueue } from "./Queues";

const REGION = process.env.myRegion || "";
const COMMAND_TOPIC = process.env.commandTopicArn || "";
const GITHUB_TOPIC = process.env.githubTopicArn || "";

module.exports.server = async event => {
  console.log(JSON.stringify(event));
  const messages = event.Records.map(record => JSON.parse(record.Sns.Message));
  await Promise.all(messages.map(processMessage));
  return;
};

module.exports.dispatcher = async event => {
  console.log(JSON.stringify(event));
  try {
    await new CommandEventsManager(REGION, COMMAND_TOPIC).publishEvent(
      JSON.stringify(event)
    );
  } catch (err) {
    return { text: "Something went wrong" };
  }
  return { text: "OK" };
};

module.exports.github = async event => {
  console.log(JSON.stringify(event));

  const prEvent: PrEvent = event.body;
  switch (prEvent.action) {
    case "closed":
      if (prEvent.pull_request.merged) {
        // PR Has been merged
        const queue: DynamoDBReleaseQueue | null = await new DynamoDBQueueManager(
          process.env.dynamoDBQueueTableName || "",
          REGION
        ).getQueueByRepository(prEvent.repository.full_name);
        if (queue) {
          await queue.remove(prEvent.pull_request.head.ref);
        }
      }

      await new GithubEventsManager(REGION, GITHUB_TOPIC).publishEvent(
        new GithubEvent("MERGE", prEvent)
      );
      break;
  }
};
async function processMessage(message) {
  const command: Command = new SlackCommandFactory().buildCommand(message.body);
  const result: CommandResult = await command.execute();
  await new ResponseManager().postResponse(
    message.body.response_url,
    result.result
  );
}
