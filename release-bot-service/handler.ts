"use strict";

import { ResponseManager, CommandEventManager } from "./Managers";
import { Command, CommandResult } from "./commands/Command";
import { SlackCommandFactory } from "./commands/SlackCommandFactory";

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
}
